"use server";

import {
  getUserPromptByEmail,
  updateUserPromptByEmail,
} from "@/lib/db/queries";

export async function fetchPrompt(email: string) {
  const res = await getUserPromptByEmail(email);
  return res || "";
}

export async function updatePrompt(email: string, prompt: string) {
  const res = await updateUserPromptByEmail(email, prompt);
}
