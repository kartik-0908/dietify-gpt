import { getUserMemories } from "@/lib/db/queries";
import { tool } from "ai";
import { z } from "zod";

export const searchUserMemoryTool = ({ userId }: { userId: string }) =>
  tool({
    description:
      "Search and retrieve stored memories about a user for personalized conversation context",
    parameters: z.object({}), // No parameters needed
    execute: async () => {
      try {
        const result = await getUserMemories(
          userId,
          undefined, // No memory type filter
          1, // Minimum importance (get all)
          100 // Fixed limit of 100 memories
        );
        console.log(result);

        if (result.success) {
          const memories = result.data || [];

          // Format memories for AI consumption
          const formattedMemories = memories.map((memory) => ({
            id: memory.id,
            content: memory.memoryContent,
            type: memory.memoryType,
            importance: memory.importanceScore,
            tags: memory.tags,
            source: memory.source,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
          }));

          return {
            success: true,
            message: `Found ${memories.length} memories for user`,
            data: {
              totalMemories: memories.length,
              memories: formattedMemories,
            },
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
              : "Failed to search user memories",
        };
      }
    },
  });
