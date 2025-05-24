"use client";
import { motion } from "framer-motion";
import React from "react";

interface HangingBannerProps {
  text: string;
}

const HangingBanner: React.FC<HangingBannerProps> = ({ text }) => {
  return (
    <motion.div
      className="fixed top-0 left-0 w-full flex justify-center z-50 pointer-events-none"
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      <div
        className="
          relative inline-block
          bg-primary text-primary-foreground
          dark:bg-secondary dark:text-secondary-foreground
          font-bold px-8 py-4 rounded-lg shadow-xl
          border border-primary dark:border-secondary
          pointer-events-auto
        "
      >
        {/* ropes */}
        <span className="absolute -top-12 left-3 h-12 w-px bg-foreground" />
        <span className="absolute -top-12 right-3 h-12 w-px bg-foreground" />

        {/* pins */}
        <span className="absolute -top-1.5 left-2 w-3 h-3 bg-foreground rounded-full" />
        <span className="absolute -top-1.5 right-2 w-3 h-3 bg-foreground rounded-full" />

        {text}
      </div>
    </motion.div>
  );
};

export default HangingBanner;
