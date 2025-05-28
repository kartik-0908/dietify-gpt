"use client";

import { useState } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { AnimatePresence } from "framer-motion";
import HangingBanner from "./banner";
import { ChevronDownIcon } from "lucide-react";

export function ChatHeader() {
  // controls banner visibility
  const [showBanner, setShowBanner] = useState(false);

  return (
    <>
      {/* ───────── Banner (fixed, no layout shift) ───────── */}
      <AnimatePresence>{showBanner && <HangingBanner />}</AnimatePresence>

      {/* ───────── Header ───────── */}
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 gap-2 z-10 overflow-x-hidden">
        <SidebarToggle />

        {/* pushes right-hand buttons to the edge */}
        <div className="flex-1" />

        {/* ─── Banner-toggle button lives *inside* the header ─── */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowBanner((prev) => !prev)}
            >
              <ChevronDownIcon
                className={`h-5 w-5 transition-transform ${
                  showBanner ? "rotate-180" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showBanner ? "Hide Today's intake" : "Show Today's intake"}
          </TooltipContent>
        </Tooltip>
      </header>
    </>
  );
}
