import type { InferSelectModel } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  decimal,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  firstName: varchar("firstName", { length: 32 }),
  lastName: varchar("lastName", { length: 32 }),
  dateOfBirth: varchar("dateOfBirth", { length: 16 }), // changed from age to dateOfBirth
  weight: varchar("weight", { length: 8 }),
  height: varchar("height", { length: 8 }),
  mobileNumber: varchar("mobileNumber", { length: 16 }),
  dietaryPreference: varchar("dietaryPreference", { length: 64 }),
  medicalConditions: json("medicalConditions").$type<string[]>(),
  foodLiking: json("foodLiking").$type<string[]>(),
  foodDisliking: json("foodDisliking").$type<string[]>(),
  fitnessGoal: varchar("fitnessGoal", { length: 32 }), // new
  activityLevel: varchar("activityLevel", { length: 32 }), // new
  gender: varchar("gender", { length: 16 }), // new
  prompt: text("prompt"),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const waterIntakeLog = pgTable("WaterIntakeLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  amount: decimal("amount", { precision: 6, scale: 2 }).notNull(), // Amount in ml/oz
  unit: varchar("unit", { length: 8 }).notNull().default("ml"), // "ml" or "oz"
  consumedAt: timestamp("consumedAt").notNull(), // When the water was consumed
  createdAt: timestamp("createdAt").notNull().defaultNow(), // When the log entry was created
  notes: text("notes"), // Optional notes (e.g., "with meal", "after workout")
  source: varchar("source", { length: 32 }).default("manual"), // How the entry was created: "manual", "app", "device"
});

export type WaterIntakeLog = InferSelectModel<typeof waterIntakeLog>;

export const caloriesIntakeLog = pgTable("CaloriesIntakeLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  calories: decimal("calories", { precision: 8, scale: 2 }).notNull(), // Calories consumed
  foodItem: varchar("foodItem", { length: 128 }).notNull(), // Name of food/dish
  quantity: decimal("quantity", { precision: 6, scale: 2 }), // Quantity consumed (e.g., 1.5)
  unit: varchar("unit", { length: 32 }), // Unit of quantity (e.g., "cup", "piece", "gram")
  mealType: varchar("mealType", { length: 32 }).notNull().default("snack"), // "breakfast", "lunch", "dinner", "snack"
  carbs: decimal("carbs", { precision: 6, scale: 2 }), // Carbohydrates in grams
  proteins: decimal("proteins", { precision: 6, scale: 2 }), // Proteins in grams
  fats: decimal("fats", { precision: 6, scale: 2 }), // Fats in grams
  consumedAt: timestamp("consumedAt").notNull(), // When the food was consumed
  createdAt: timestamp("createdAt").notNull().defaultNow(), // When the log entry was created
  notes: text("notes"), // Optional notes (e.g., "homemade", "restaurant")
  source: varchar("source", { length: 32 }).default("manual"), // How the entry was created: "manual", "app", "barcode"
});

export type CaloriesIntakeLog = InferSelectModel<typeof caloriesIntakeLog>;

export const userMemory = pgTable("UserMemory", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  memoryContent: text("memoryContent").notNull(), // The actual memory/information about the user
  memoryType: varchar("memoryType", { length: 32 })
    .notNull()
    .default("general"), // "preference", "goal", "fact", "routine", "general"
  importanceScore: integer("importanceScore").notNull().default(5), // 1-10 scale for memory importance
  tags: json("tags").$type<string[]>(), // Tags for categorization and retrieval
  source: varchar("source", { length: 32 }).notNull().default("conversation"), // "conversation", "profile", "activity", "inference"
  isActive: boolean("isActive").notNull().default(true), // For soft deletion
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type UserMemory = InferSelectModel<typeof userMemory>;
