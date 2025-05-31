import { addCaloriesIntake } from "@/lib/db/queries";
import { tool } from "ai";
import { z } from "zod";

export const logCaloriesIntake = ({ userId }: { userId: string }) =>
  tool({
    description:
      "Log and save the calories and other macros like carbs, protiens and fats intake by User",
    parameters: z.object({
      calories: z.number().positive("Calories must be a positive number"),
      carbs: z.number().positive("Carbs must be a positive number"),
      proteins: z.number().positive("Proteins must be a positive number"),
      fats: z.number().positive("Fats must be a positive number"),
      foodItem: z
        .string()
        .min(1, "Food item name is required")
        .max(128, "Food item name too long"),
      quantity: z
        .number()
        .positive("Quantity must be a positive number")
        .optional(),
      unit: z.string().max(32, "Unit name too long").optional(),
      mealType: z
        .enum(["breakfast", "lunch", "dinner", "snack"])
        .optional()
        .default("snack"),

      consumedAt: z.string().datetime().optional(),
      notes: z.string().optional(),
      source: z.enum(["manual", "app", "barcode"]).optional().default("app"),
    }),
    execute: async ({
      calories,
      foodItem,
      quantity,
      unit,
      mealType,
      carbs,
      proteins,
      fats,
      consumedAt,
      notes,
      source,
    }) => {
      try {
        const result = await addCaloriesIntake({
          userId,
          calories,
          foodItem,
          quantity,
          unit,
          mealType,
          carbs,
          proteins,
          fats,
          consumedAt: consumedAt ? new Date(consumedAt) : undefined,
          notes,
          source,
        });

        if (result.success) {
          return {
            success: true,
            message: `Successfully logged ${calories} calories for ${foodItem}`,
            data: result.data,
          };
        } else {
          return {
            success: false,
            error: result.error,
          };
        }
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to log calories intake",
        };
      }
    },
  });
