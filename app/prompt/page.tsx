"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetchPrompt, updatePrompt } from "./actions";

export default function PromptPage() {
  const { data: session } = useSession();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) return;
    setLoading(true);
    fetchPrompt(session.user.email)
      .then(setPrompt)
      .catch(() => toast.error("Error fetching prompt"))
      .finally(() => setLoading(false));
  }, [session?.user?.email]);

  const handleSave = async () => {
    if (!session?.user?.email) return;
    setSaving(true);
    try {
      await updatePrompt(session.user.email, prompt);
      toast.success("Prompt updated successfully!");
    } catch {
      toast.error("Failed to update prompt");
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="p-8 text-center">Please sign in to view your prompt.</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Your Custom Prompt</h1>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        placeholder="Enter your custom prompt here..."
        disabled={loading}
        className="mb-4"
      />
      <Button onClick={handleSave} disabled={saving || loading}>
        {saving ? "Saving..." : "Save Prompt"}
      </Button>
    </div>
  );
}
