import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  generateText,
  smoothStream,
  streamText,
} from "ai";
import { auth, type UserType } from "@/app/(auth)/auth";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import {
  addUserMemory,
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  getUserPersonalDetailsIfComplete,
  getUserPromptByEmail,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { generateUUID, getTrailingMessageId } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { logWaterIntake } from "@/lib/ai/tools/logWater";
import { isProductionEnvironment } from "@/lib/constants";
import { myProvider } from "@/lib/ai/providers";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { postRequestBodySchema, type PostRequestBody } from "./schema";
import { geolocation } from "@vercel/functions";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { after } from "next/server";
import type { Chat } from "@/lib/db/schema";
import { differenceInSeconds } from "date-fns";
import { logCaloriesIntake } from "@/lib/ai/tools/logCalorie";
import { searchUserMemoryTool } from "@/lib/ai/tools/memory";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

async function shouldStoreAsMemoryLLM(
  messageText: string,
  provider = myProvider
): Promise<boolean> {
  try {
    const result = await generateText({
      model: myProvider.languageModel("chat-model"), // Use faster model for analysis
      system: `You are a memory analyzer. Determine if a user message contains information worth remembering for future conversations.

Store messages that contain:
- Personal preferences (food, exercise, lifestyle)
- Goals and aspirations
- Health information or medical conditions
- Routines and habits
- Important facts about the user
- Meaningful experiences or context

DO NOT store messages that are:
- Simple greetings (hi, hello, thanks)
- Basic questions without personal context
- Very short responses (ok, yes, no, sure)
- Commands or requests without personal information

Respond with only "YES" if it should be stored, or "NO" if it shouldn't.`,
      prompt: `Should this message be stored as a memory? Message: "${messageText}"`,
      maxTokens: 10,
    });

    return result.text.trim().toUpperCase() === "YES";
  } catch (error) {
    console.error("Failed to analyze message with LLM:", error);
    // Fallback to storing if LLM fails
    return messageText.length > 10;
  }
}

async function extractMemoryContentLLM(
  messageText: string,
  provider = myProvider
): Promise<{
  memoryContent: string;
  memoryType: "preference" | "goal" | "fact" | "routine" | "general";
  importanceScore: number;
  tags: string[];
}> {
  try {
    const result = await generateText({
      model: myProvider.languageModel("chat-model"), // Use faster model for extraction
      system: `You are a memory extractor. Extract and summarize the key information from user messages that should be remembered.

Create a concise memory entry (max 100 characters) that captures the essential information.

Classify the memory type:
- preference: likes, dislikes, preferences
- goal: aspirations, targets, objectives
- fact: personal facts, conditions, circumstances
- routine: habits, regular activities, schedules
- general: other meaningful information

Rate importance (1-10):
- 9-10: Critical health/medical info, major goals
- 7-8: Important preferences, significant facts
- 5-6: Regular habits, moderate preferences
- 3-4: Minor preferences, general info
- 1-2: Least important context

Extract relevant tags from: nutrition, fitness, health, sleep, hydration, weight, medical, work, family, hobby

Respond in this exact JSON format:
{
  "memoryContent": "concise summary",
  "memoryType": "type",
  "importanceScore": number,
  "tags": ["tag1", "tag2"]
}`,
      prompt: `Extract key information from: "${messageText}"`,
      maxTokens: 200,
    });

    // Parse the JSON response
    const parsed = JSON.parse(result.text.trim());

    // Validate the response
    if (
      !parsed.memoryContent ||
      !parsed.memoryType ||
      !parsed.importanceScore
    ) {
      throw new Error("Invalid LLM response format");
    }

    return {
      memoryContent: parsed.memoryContent.substring(0, 200), // Ensure max length
      memoryType: parsed.memoryType,
      importanceScore: Math.max(1, Math.min(10, parsed.importanceScore)), // Clamp to 1-10
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (error) {
    console.error("Failed to extract memory content with LLM:", error);
    // Fallback to basic extraction
    return {
      memoryContent:
        messageText.substring(0, 100) + (messageText.length > 100 ? "..." : ""),
      memoryType: "general",
      importanceScore: 5,
      tags: [],
    };
  }
}

// Function to store user message as memory using LLM analysis (non-blocking)
async function storeMessageAsMemoryLLM(userId: string, messageText: string) {
  try {
    // Skip very short messages
    if (messageText.trim().length < 5) {
      return;
    }

    // Use LLM to determine if message should be stored
    const shouldStore = await shouldStoreAsMemoryLLM(messageText);

    if (!shouldStore) {
      return;
    }

    // Use LLM to extract and summarize the key information
    const memoryData = await extractMemoryContentLLM(messageText);

    await addUserMemory({
      userId,
      memoryContent: memoryData.memoryContent,
      memoryType: memoryData.memoryType,
      importanceScore: memoryData.importanceScore,
      tags: memoryData.tags.length > 0 ? memoryData.tags : undefined,
      source: "conversation",
    });

    console.log(
      `Stored memory for user ${userId}: ${memoryData.memoryContent}`
    );
  } catch (error) {
    console.error("Failed to store message as memory:", error);
    // Don't throw - we don't want memory storage failures to break the chat
  }
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new Response("Invalid request body", { status: 400 });
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new Response(
        "You have exceeded your maximum number of messages for the day! Please try again later.",
        {
          status: 429,
        }
      );
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });
    const userId = session.user.id;

    const messageText = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ");

    // Fire and forget - don't await to avoid blocking the chat response
    storeMessageAsMemoryLLM(userId, messageText).catch((error) => {
      console.error("Memory storage failed:", error);
    });
    const data = await getUserPersonalDetailsIfComplete({
      userId,
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const prompt = (await getUserPromptByEmail(session.user.email || "")) || "";

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            email: session.user.email || "",
            prompt: prompt,
            foodLiking: data?.foodLiking || [],
            foodDislikings: data?.foodDisliking || [],
            requestHints,
            firstName: data?.firstName || "",
            lastName: data?.lastName || "",
            dateOfBirth: data?.dateOfBirth || "",
            weight: data?.weight || "",
            height: data?.height || "",
            dietaryPreference: data?.dietaryPreference || "",
            medicalConditions: data?.medicalConditions || [],
          }),
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "logWaterIntake",
                  "logCaloriesIntake",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                  "searchUserMemoryTool",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
          tools: {
            logWaterIntake: logWaterIntake({ userId }),
            logCaloriesIntake: logCaloriesIntake({ userId }),
            searchUserMemoryTool: searchUserMemoryTool({ userId }),
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === "assistant"
                  ),
                });

                if (!assistantId) {
                  throw new Error("No assistant message found!");
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error("Failed to save chat");
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (e) => {
        console.error(e);
        return "Oops, an error occurred!";
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream)
      );
    } else {
      return new Response(stream);
    }
  } catch (_) {
    console.error(_);
    return new Response("An error occurred while processing your request!", {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("id is required", { status: 400 });
  }

  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  if (!chat) {
    return new Response("Not found", { status: 404 });
  }

  if (chat.visibility === "private" && chat.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new Response("No streams found", { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response("No recent stream found", { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== "assistant") {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: "append-message",
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const deletedChat = await deleteChatById({ id });

    return Response.json(deletedChat, { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("An error occurred while processing your request!", {
      status: 500,
    });
  }
}
