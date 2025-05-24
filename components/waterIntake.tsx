"use client";

import cx from "classnames";

interface WaterLoggedData {
  success: boolean;
  message: string;
}

const SAMPLE: WaterLoggedData = {
  success: true,
  message: "Successfully logged 250ml of water intake",
};

export function WaterLogged({
  waterData = SAMPLE,
}: {
  waterData?: WaterLoggedData;
}) {
  if (!waterData.success) {
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
        <p className="text-sm font-medium">{waterData.message}</p>
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
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <p className="text-sm font-medium">{waterData.message}</p>
    </div>
  );
}
