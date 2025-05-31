import { getTodayIntakeSummary } from "@/lib/db/queries"; // Adjust path to where you put the intake functions
import { type NextRequest, NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const intakeData = await getTodayIntakeSummary(userId);

    if (!intakeData.success) {
      return NextResponse.json(
        { success: false, error: intakeData.error },
        { status: 500 }
      );
    }

    // Extract the key amounts from the detailed data
    const response = {
      success: true,
      data: {
        calorieAmount: intakeData.data?.calories?.totalCalories || 0,
        waterIntakeAmount: intakeData.data?.water?.totalWaterML || 0,
        waterIntakeAmountOZ: intakeData.data?.water?.totalWaterOZ || 0,
        date: intakeData.data?.date,
        timezone: intakeData.data?.timezone,
        // Optional: include entry counts for additional context
        calorieEntryCount: intakeData.data?.calories?.entryCount || 0,
        waterEntryCount: intakeData.data?.water?.entryCount || 0,
        carbsAmount: intakeData.data?.carbsAmount || 0,
        proteinsAmount: intakeData.data?.proteinsAmount || 0,
        fatsAmount: intakeData.data?.fatsAmount || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching today's intake data:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
