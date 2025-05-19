import { updateUserPersonalDetails } from "@/lib/db/queries";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // You may want to get the user's email from session/auth instead
    await updateUserPersonalDetails(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user details:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
