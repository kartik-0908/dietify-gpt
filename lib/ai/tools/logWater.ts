import { addWaterIntake } from "@/lib/db/queries";
import { tool } from "ai";
import { z } from "zod";

export const logWaterIntake = ({ userId }: { userId: string }) =>
  tool({
    description: "Log and save the water intake by User",
    parameters: z.object({
      amount: z.number().positive("Amount must be a positive number"),
      unit: z.enum(["ml", "oz"]).optional().default("ml"),
      consumedAt: z.string().datetime().optional(),
      notes: z.string().optional(),
      source: z.enum(["manual", "app", "device"]).optional().default("app"),
    }),
    execute: async ({ amount, unit, consumedAt, notes, source }) => {
      console.log("tryng to log water");
      try {
        const result = await addWaterIntake({
          userId,
          amount,
          unit,
          consumedAt: consumedAt ? new Date(consumedAt) : undefined,
          notes,
          source,
        });
        console.log(JSON.stringify(result));

        if (result.success) {
          return {
            success: true,
            message: `Successfully logged ${amount}${unit} of water intake`,
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
              : "Failed to log water intake",
        };
      }
    },
  });
