import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  waterIntakeLog,
  type WaterIntakeLog,
  caloriesIntakeLog,
  type CaloriesIntakeLog,
  userMemory,
  type UserMemory,
} from "./schema";
import type { ArtifactKind } from "@/components/artifact";
import { generateUUID } from "../utils";
import { generateHashedPassword } from "./utils";
import type { VisibilityType } from "@/components/visibility-selector";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Failed to create guest user in database");
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database"
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database"
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by id after timestamp from database"
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    console.error(
      "Failed to get message count by user id for the last 24 hours from database"
    );
    throw error;
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    console.error("Failed to create stream id in database");
    throw error;
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    console.error("Failed to get stream ids by chat id from database");
    throw error;
  }
}

export async function updateUserPersonalDetails({
  email,
  firstName,
  lastName,
  dateOfBirth,
  weight,
  height,
  mobileNumber,
  dietaryPreference,
  medicalConditions,
  foodLiking,
  foodDisliking,
  fitnessGoal,
  activityLevel,
  gender,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // changed from age
  weight?: string;
  height?: string;
  mobileNumber?: string;
  dietaryPreference?: string;
  medicalConditions?: string[];
  foodLiking?: string[];
  foodDisliking?: string[];
  fitnessGoal?: string;
  activityLevel?: string;
  gender?: string;
}) {
  try {
    return await db
      .update(user)
      .set({
        firstName,
        lastName,
        dateOfBirth, // changed from age
        weight,
        height,
        mobileNumber,
        dietaryPreference,
        medicalConditions,
        foodLiking,
        foodDisliking,
        fitnessGoal,
        activityLevel,
        gender,
      })
      .where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to update user personal details in database");
    throw error;
  }
}

export async function getUserPersonalDetailsIfComplete({
  userId,
}: {
  userId: string;
}) {
  try {
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));
    if (!userRecord) return null;
    // Return all relevant fields, even if they are null or empty
    const {
      firstName,
      lastName,
      dateOfBirth,
      weight,
      height,
      mobileNumber,
      dietaryPreference,
      medicalConditions,
      foodDisliking,
      foodLiking,
    } = userRecord;
    return {
      firstName,
      lastName,
      dateOfBirth,
      weight,
      height,
      mobileNumber,
      dietaryPreference,
      medicalConditions,
      foodDisliking,
      foodLiking,
    };
  } catch (error) {
    console.error("Failed to get user personal details from database");
    throw error;
  }
}

// Get the prompt for a user by email
export async function getUserPromptByEmail(
  email: string
): Promise<string | null> {
  try {
    const [userRecord] = await db
      .select({ prmtp: user.prompt })
      .from(user)
      .where(eq(user.email, email));
    return userRecord?.prmtp ?? null;
  } catch (error) {
    console.error("Failed to get user prompt from database");
    throw error;
  }
}

// Update the prompt for a user by email
export async function updateUserPromptByEmail(email: string, prompt: string) {
  try {
    await db.update(user).set({ prompt }).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to update user prompt in database");
    throw error;
  }
}

interface AddWaterIntakeParams {
  userId: string;
  amount: number;
  unit?: "ml" | "oz";
  consumedAt?: Date;
  notes?: string;
  source?: "manual" | "app" | "device";
}

interface AddWaterIntakeResult {
  success: boolean;
  data?: WaterIntakeLog;
  error?: string;
}

export async function addWaterIntake(
  params: AddWaterIntakeParams
): Promise<AddWaterIntakeResult> {
  try {
    const {
      userId,
      amount,
      unit = "ml",
      consumedAt = new Date(),
      notes,
      source = "manual",
    } = params;

    // Validate required parameters
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    if (!amount || amount <= 0) {
      return {
        success: false,
        error: "Amount must be a positive number",
      };
    }

    // Validate unit
    if (!["ml", "oz"].includes(unit)) {
      return {
        success: false,
        error: "Unit must be either 'ml' or 'oz'",
      };
    }

    // Insert water intake log
    const result = await db
      .insert(waterIntakeLog)
      .values({
        userId,
        amount: amount.toString(), // Convert to string for decimal field
        unit,
        consumedAt,
        createdAt: new Date(),
        notes: notes || null,
        source,
      })
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: "Failed to create water intake log",
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error("Error adding water intake:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

interface AddCaloriesIntakeParams {
  userId: string;
  calories: number;
  foodItem: string;
  quantity?: number;
  unit?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  consumedAt?: Date;
  notes?: string;
  source?: "manual" | "app" | "barcode";
}

interface AddCaloriesIntakeResult {
  success: boolean;
  data?: CaloriesIntakeLog;
  error?: string;
}

/**
 * Adds a calories intake log entry for a user
 * @param params - Object containing calories intake parameters
 * @returns Promise with result containing success status and data/error
 */
export async function addCaloriesIntake(
  params: AddCaloriesIntakeParams
): Promise<AddCaloriesIntakeResult> {
  try {
    const {
      userId,
      calories,
      foodItem,
      quantity,
      unit,
      mealType = "snack",
      consumedAt = new Date(),
      notes,
      source = "manual",
    } = params;

    // Validate required parameters
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    if (!calories || calories <= 0) {
      return {
        success: false,
        error: "Calories must be a positive number",
      };
    }

    if (!foodItem || foodItem.trim().length === 0) {
      return {
        success: false,
        error: "Food item name is required",
      };
    }

    // Validate meal type
    if (!["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
      return {
        success: false,
        error: "Meal type must be 'breakfast', 'lunch', 'dinner', or 'snack'",
      };
    }

    // Validate quantity if provided
    if (quantity !== undefined && quantity <= 0) {
      return {
        success: false,
        error: "Quantity must be a positive number",
      };
    }

    // Insert calories intake log
    const result = await db
      .insert(caloriesIntakeLog)
      .values({
        userId,
        calories: calories.toString(),
        foodItem: foodItem.trim(),
        quantity: quantity ? quantity.toString() : null,
        unit: unit || null,
        mealType,
        consumedAt,
        createdAt: new Date(),
        notes: notes || null,
        source,
      })
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: "Failed to create calories intake log",
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error("Error adding calories intake:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Convenience function to add calories intake with just essential details
 * @param userId - User's UUID
 * @param calories - Number of calories
 * @param foodItem - Name of the food item
 * @param mealType - Type of meal
 * @returns Promise with result
 */
export async function addCaloriesIntakeSimple(
  userId: string,
  calories: number,
  foodItem: string,
  mealType: "breakfast" | "lunch" | "dinner" | "snack" = "snack"
): Promise<AddCaloriesIntakeResult> {
  return addCaloriesIntake({
    userId,
    calories,
    foodItem,
    mealType,
  });
}

/**
 * Add multiple calories intake entries for a user (bulk insert)
 * @param userId - User's UUID
 * @param entries - Array of calories intake entries
 * @returns Promise with results
 */
export async function addMultipleCaloriesIntakes(
  userId: string,
  entries: Array<{
    calories: number;
    foodItem: string;
    quantity?: number;
    unit?: string;
    mealType?: "breakfast" | "lunch" | "dinner" | "snack";
    consumedAt?: Date;
    notes?: string;
    source?: "manual" | "app" | "barcode";
  }>
): Promise<{ success: boolean; data?: CaloriesIntakeLog[]; error?: string }> {
  try {
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    if (!entries || entries.length === 0) {
      return {
        success: false,
        error: "At least one entry is required",
      };
    }

    // Validate all entries first
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.calories || entry.calories <= 0) {
        return {
          success: false,
          error: `Entry ${i + 1}: Calories must be a positive number`,
        };
      }
      if (!entry.foodItem || entry.foodItem.trim().length === 0) {
        return {
          success: false,
          error: `Entry ${i + 1}: Food item name is required`,
        };
      }
    }

    // Prepare data for bulk insert
    const insertData = entries.map((entry) => ({
      userId,
      calories: entry.calories.toString(),
      foodItem: entry.foodItem.trim(),
      quantity: entry.quantity ? entry.quantity.toString() : null,
      unit: entry.unit || null,
      mealType: entry.mealType || "snack",
      consumedAt: entry.consumedAt || new Date(),
      createdAt: new Date(),
      notes: entry.notes || null,
      source: entry.source || "manual",
    }));

    // Bulk insert
    const result = await db
      .insert(caloriesIntakeLog)
      .values(insertData)
      .returning();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error adding multiple calories intakes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get daily calories total for a user
 * @param userId - User's UUID
 * @param date - Date to get calories for (defaults to today)
 * @returns Promise with total calories for the day
 */
export async function getDailyCaloriesTotal(
  userId: string,
  date: Date = new Date()
): Promise<{ success: boolean; total?: number; error?: string }> {
  try {
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    // Get start and end of the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Query calories for the day
    const result = await db
      .select({
        calories: caloriesIntakeLog.calories,
      })
      .from(caloriesIntakeLog)
      .where(
        and(
          eq(caloriesIntakeLog.userId, userId),
          gte(caloriesIntakeLog.consumedAt, startOfDay),
          lte(caloriesIntakeLog.consumedAt, endOfDay)
        )
      );

    // Sum up the calories
    const total = result.reduce((sum, entry) => {
      return sum + Number.parseFloat(entry.calories);
    }, 0);

    return {
      success: true,
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
    };
  } catch (error) {
    console.error("Error getting daily calories total:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

interface AddUserMemoryParams {
  userId: string;
  memoryContent: string;
  memoryType?: "preference" | "goal" | "fact" | "routine" | "general";
  importanceScore?: number;
  tags?: string[];
  source?: "conversation" | "profile" | "activity" | "inference";
}

interface AddUserMemoryResult {
  success: boolean;
  data?: UserMemory;
  error?: string;
}

/**
 * Adds a memory entry for a specific user
 * @param params - Object containing user memory parameters
 * @returns Promise with result containing success status and data/error
 */
export async function addUserMemory(
  params: AddUserMemoryParams
): Promise<AddUserMemoryResult> {
  try {
    const {
      userId,
      memoryContent,
      memoryType = "general",
      importanceScore = 5,
      tags,
      source = "conversation",
    } = params;

    // Validate required parameters
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    if (!memoryContent || memoryContent.trim().length === 0) {
      return {
        success: false,
        error: "Memory content is required",
      };
    }

    // Validate memory type
    if (
      !["preference", "goal", "fact", "routine", "general"].includes(memoryType)
    ) {
      return {
        success: false,
        error:
          "Memory type must be 'preference', 'goal', 'fact', 'routine', or 'general'",
      };
    }

    // Validate importance score
    if (importanceScore < 1 || importanceScore > 10) {
      return {
        success: false,
        error: "Importance score must be between 1 and 10",
      };
    }

    // Validate source
    if (
      !["conversation", "profile", "activity", "inference"].includes(source)
    ) {
      return {
        success: false,
        error:
          "Source must be 'conversation', 'profile', 'activity', or 'inference'",
      };
    }

    const now = new Date();

    // Insert user memory
    const result = await db
      .insert(userMemory)
      .values({
        userId,
        memoryContent: memoryContent.trim(),
        memoryType,
        importanceScore,
        tags: tags || null,
        source,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: "Failed to create user memory",
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error("Error adding user memory:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Convenience function to add a simple memory with minimal parameters
 * @param userId - User's UUID
 * @param memoryContent - The memory content
 * @param memoryType - Type of memory
 * @param importanceScore - Importance score (1-10)
 * @returns Promise with result
 */
export async function addUserMemorySimple(
  userId: string,
  memoryContent: string,
  memoryType:
    | "preference"
    | "goal"
    | "fact"
    | "routine"
    | "general" = "general",
  importanceScore = 5
): Promise<AddUserMemoryResult> {
  return addUserMemory({
    userId,
    memoryContent,
    memoryType,
    importanceScore,
  });
}

/**
 * Add multiple memories for a user (bulk insert)
 * @param userId - User's UUID
 * @param memories - Array of memory entries
 * @returns Promise with results
 */
export async function addMultipleUserMemories(
  userId: string,
  memories: Array<{
    memoryContent: string;
    memoryType?: "preference" | "goal" | "fact" | "routine" | "general";
    importanceScore?: number;
    tags?: string[];
    source?: "conversation" | "profile" | "activity" | "inference";
  }>
): Promise<{ success: boolean; data?: UserMemory[]; error?: string }> {
  try {
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    if (!memories || memories.length === 0) {
      return {
        success: false,
        error: "At least one memory is required",
      };
    }

    // Validate all memories first
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      if (!memory.memoryContent || memory.memoryContent.trim().length === 0) {
        return {
          success: false,
          error: `Memory ${i + 1}: Memory content is required`,
        };
      }
    }

    const now = new Date();

    // Prepare data for bulk insert
    const insertData = memories.map((memory) => ({
      userId,
      memoryContent: memory.memoryContent.trim(),
      memoryType: memory.memoryType || "general",
      importanceScore: memory.importanceScore || 5,
      tags: memory.tags || null,
      source: memory.source || "conversation",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));

    // Bulk insert
    const result = await db.insert(userMemory).values(insertData).returning();

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error adding multiple user memories:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get user memories by type and importance
 * @param userId - User's UUID
 * @param memoryType - Optional filter by memory type
 * @param minImportance - Minimum importance score to retrieve
 * @param limit - Maximum number of memories to return
 * @returns Promise with user memories
 */
export async function getUserMemories(
  userId: string,
  memoryType?: "preference" | "goal" | "fact" | "routine" | "general",
  minImportance = 1,
  limit = 50
): Promise<{ success: boolean; data?: UserMemory[]; error?: string }> {
  try {
    if (!userId) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    // Build query conditions
    const conditions = [
      eq(userMemory.userId, userId),
      eq(userMemory.isActive, true),
      gte(userMemory.importanceScore, minImportance),
    ];

    if (memoryType) {
      conditions.push(eq(userMemory.memoryType, memoryType));
    }

    // Query memories
    const result = await db
      .select()
      .from(userMemory)
      .where(and(...conditions))
      .orderBy(desc(userMemory.importanceScore), desc(userMemory.updatedAt))
      .limit(limit);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error getting user memories:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Update a user memory (for updating importance or content)
 * @param memoryId - Memory's UUID
 * @param updates - Fields to update
 * @returns Promise with result
 */
export async function updateUserMemory(
  memoryId: string,
  updates: {
    memoryContent?: string;
    memoryType?: "preference" | "goal" | "fact" | "routine" | "general";
    importanceScore?: number;
    tags?: string[];
    isActive?: boolean;
  }
): Promise<AddUserMemoryResult> {
  try {
    if (!memoryId) {
      return {
        success: false,
        error: "Memory ID is required",
      };
    }

    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update memory
    const result = await db
      .update(userMemory)
      .set(updateData)
      .where(eq(userMemory.id, memoryId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: "Memory not found or update failed",
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error("Error updating user memory:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get current date range for India (IST timezone)
 * @returns Object with start and end of today in IST
 */
function getTodayIST() {
  const now = new Date();
  console.log(now);

  // Convert to IST (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istNow = new Date(now.getTime() + istOffset);

  // Get start of day (00:00:00) in IST
  const startOfDay = new Date(istNow);
  startOfDay.setHours(0, 0, 0, 0);

  // Get end of day (23:59:59.999) in IST
  const endOfDay = new Date(istNow);
  endOfDay.setHours(23, 59, 59, 999);

  // Convert back to UTC for database storage
  const startOfDayUTC = new Date(startOfDay.getTime() - istOffset);
  const endOfDayUTC = new Date(endOfDay.getTime() - istOffset);

  return {
    startOfDay: startOfDayUTC,
    endOfDay: endOfDayUTC,
    currentIST: istNow,
  };
}

/**
 * Fetch today's total calorie intake for a user
 * @param userId - User's UUID
 * @returns Promise with total calories and detailed logs
 */
export async function getTodayCalorieIntake(userId: string) {
  try {
    const { startOfDay, endOfDay } = getTodayIST();

    // Fetch detailed calorie logs for today
    const calorieEntries = await db
      .select()
      .from(caloriesIntakeLog)
      .where(
        and(
          eq(caloriesIntakeLog.userId, userId),
          gte(caloriesIntakeLog.consumedAt, startOfDay),
          lte(caloriesIntakeLog.consumedAt, endOfDay)
        )
      )
      .orderBy(caloriesIntakeLog.consumedAt);

    // Calculate total calories
    const totalCalories = calorieEntries.reduce((sum, entry) => {
      return sum + Number.parseFloat(entry.calories.toString());
    }, 0);

    // Group by meal type for better insights
    const caloriesByMeal = calorieEntries.reduce((acc, entry) => {
      const mealType = entry.mealType;
      if (!acc[mealType]) {
        acc[mealType] = {
          calories: 0,
          entries: [],
        };
      }
      acc[mealType].calories += Number.parseFloat(entry.calories.toString());
      acc[mealType].entries.push(entry);
      return acc;
    }, {} as Record<string, { calories: number; entries: typeof calorieEntries }>);

    return {
      success: true,
      data: {
        totalCalories,
        entryCount: calorieEntries.length,
        entries: calorieEntries,
        caloriesByMeal,
        date: getTodayIST().currentIST.toISOString().split("T")[0],
      },
    };
  } catch (error) {
    console.error("Error fetching today's calorie intake:", error);
    return {
      success: false,
      error: "Failed to fetch calorie intake data",
      data: null,
    };
  }
}

/**
 * Fetch today's total water intake for a user
 * @param userId - User's UUID
 * @returns Promise with total water intake and detailed logs
 */
export async function getTodayWaterIntake(userId: string) {
  try {
    const { startOfDay, endOfDay } = getTodayIST();

    // Fetch detailed water intake logs for today
    const waterEntries = await db
      .select()
      .from(waterIntakeLog)
      .where(
        and(
          eq(waterIntakeLog.userId, userId),
          gte(waterIntakeLog.consumedAt, startOfDay),
          lte(waterIntakeLog.consumedAt, endOfDay)
        )
      )
      .orderBy(waterIntakeLog.consumedAt);

    // Calculate total water intake (convert all to ml for consistency)
    let totalWaterML = 0;
    const waterByUnit = { ml: 0, oz: 0 };

    waterEntries.forEach((entry) => {
      const amount = Number.parseFloat(entry.amount.toString());
      if (entry.unit === "oz") {
        // Convert oz to ml (1 oz = 29.5735 ml)
        totalWaterML += amount * 29.5735;
        waterByUnit.oz += amount;
      } else {
        // Already in ml
        totalWaterML += amount;
        waterByUnit.ml += amount;
      }
    });

    return {
      success: true,
      data: {
        totalWaterML: Math.round(totalWaterML * 100) / 100, // Round to 2 decimal places
        totalWaterOZ: Math.round((totalWaterML / 29.5735) * 100) / 100,
        entryCount: waterEntries.length,
        entries: waterEntries,
        waterByUnit,
        date: getTodayIST().currentIST.toISOString().split("T")[0],
      },
    };
  } catch (error) {
    console.error("Error fetching today's water intake:", error);
    return {
      success: false,
      error: "Failed to fetch water intake data",
      data: null,
    };
  }
}

/**
 * Combined function to get both calorie and water intake for today
 * @param userId - User's UUID
 * @returns Promise with both calorie and water intake data
 */
export async function getTodayIntakeSummary(userId: string) {
  try {
    const [calorieResult, waterResult] = await Promise.all([
      getTodayCalorieIntake(userId),
      getTodayWaterIntake(userId),
    ]);

    return {
      success: true,
      data: {
        calories: calorieResult.data,
        water: waterResult.data,
        date: getTodayIST().currentIST.toISOString().split("T")[0],
        timezone: "IST (UTC+5:30)",
      },
    };
  } catch (error) {
    console.error("Error fetching today's intake summary:", error);
    return {
      success: false,
      error: "Failed to fetch intake summary",
      data: null,
    };
  }
}
