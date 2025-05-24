"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";

import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "../icons";
import { useSidebar } from "../ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import HangingBanner from "./banner"; // the fixed banner you updated earlier
import { Plus } from "lucide-react";

export function ChatHeader() {
  const router = useRouter();
  const { open } = useSidebar();
  const { width: windowWidth } = useWindowSize();

  // controls banner visibility
  const [showBanner, setShowBanner] = useState(false);

  return (
    <>
      {/* ───────── Banner (fixed, no layout shift) ───────── */}
      {/* <AnimatePresence>
        {showBanner && <HangingBanner text="Hello from the top!" />}
      </AnimatePresence> */}

      {/* ───────── Header ───────── */}
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 gap-2 z-10 overflow-x-hidden">
        <SidebarToggle />

        {(!open || windowWidth < 768) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="md:px-2 px-2 md:h-fit ml-0"
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }}
              >
                <PlusIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Chat</TooltipContent>
          </Tooltip>
        )}

        {/* pushes right-hand buttons to the edge */}
        {/* <div className="flex-1" /> */}

        {/* ─── Banner-toggle button lives *inside* the header ─── */}
        {/* <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBanner((prev) => !prev)}
            >
              <Plus
                className={`h-5 w-5 transition-transform ${
                  showBanner ? "rotate-45" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showBanner ? "Hide banner" : "Show banner"}
          </TooltipContent>
        </Tooltip> */}
      </header>
    </>
  );
}
