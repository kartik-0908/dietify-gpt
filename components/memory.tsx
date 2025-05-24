"use client";

interface MemoriesSearchedData {
  success: boolean;
  message: string;
}

const SAMPLE: MemoriesSearchedData = {
  success: true,
  message: "Retrieved recent memories for personalized conversation",
};

export function MemoriesSearched({
  memoriesData = SAMPLE,
}: {
  memoriesData?: MemoriesSearchedData;
}) {
  if (!memoriesData.success) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive max-w-sm">
        <div className="size-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-3 h-3"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <p className="text-sm font-medium">{memoriesData.message}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-primary max-w-sm">
      <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="w-3 h-3"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <p className="text-sm font-medium">{memoriesData.message}</p>
    </div>
  );
}
