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
