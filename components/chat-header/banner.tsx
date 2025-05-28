"use client";
import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Droplet, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";

// Animated Number Component with counting effect
const AnimatedNumber = ({
  value,
  formatter,
  className = "",
}: {
  value: number;
  formatter: (n: number) => string;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value === displayValue) return;

    setIsAnimating(true);
    const startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;

    // Dynamic duration based on difference
    const baseDuration = 1500; // 1.5 seconds base
    const duration = Math.min(Math.abs(difference) * 15, baseDuration);

    const startTime = Date.now();

    // Easing function for smooth animation
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const animateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        const easedProgress = easeOutQuart(progress);
        const currentValue = startValue + difference * easedProgress;
        setDisplayValue(Math.round(currentValue));
        requestAnimationFrame(animateValue);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animateValue);

    return () => {
      setIsAnimating(false);
    };
  }, [value, displayValue]);

  return (
    <motion.span
      className={className}
      animate={
        isAnimating
          ? {
              scale: [1, 1.02, 1],
            }
          : {}
      }
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {formatter(displayValue)}
    </motion.span>
  );
};

// Animated Container with pulse effect on change
const AnimatedMetric = ({
  icon,
  value,
  formatter,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  formatter: (n: number) => string;
  label: string;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const prevValue = useRef(value);

  // Trigger pulse animation when value changes
  useEffect(() => {
    if (prevValue.current !== value && prevValue.current !== 0) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 600);
      return () => clearTimeout(timer);
    }
    prevValue.current = value;
  }, [value]);

  return (
    <motion.div
      className="flex items-center space-x-2 relative"
      animate={
        isUpdating
          ? {
              scale: [1, 1.05, 1],
              transition: { duration: 0.3, ease: "easeInOut" },
            }
          : {}
      }
    >
      {/* Glow effect on update */}
      <motion.div
        className="absolute inset-0 rounded-md bg-white/20 blur-sm"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isUpdating ? [0, 0.8, 0] : 0,
          scale: isUpdating ? [0.8, 1.2, 0.8] : 1,
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* Icon with subtle bounce on update */}
      <motion.div
        animate={
          isUpdating
            ? {
                y: [0, -2, 0],
                rotate: [0, 5, -5, 0],
                transition: { duration: 0.4, ease: "easeInOut" },
              }
            : {}
        }
      >
        {icon}
      </motion.div>

      {/* Animated number */}
      <AnimatedNumber
        value={value}
        formatter={formatter}
        className="font-mono tracking-wider"
      />
    </motion.div>
  );
};

const HangingBanner = () => {
  const { data: session } = useSession();
  const userId = session?.user.id;
  console.log(userId);
  const [calories, setCalories] = useState<number>(0);
  const [water, setWater] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch data from the API route instead of calling the function directly
        const response = await fetch(`/api/user/intake?userId=${userId}`);
        const result = await response.json();

        if (result.success) {
          // On initial load, animate from 0 to target values
          if (initialLoad) {
            setTimeout(() => {
              setCalories(result.data.calorieAmount || 0);
              setWater(result.data.waterIntakeAmount || 0);
              setInitialLoad(false);
            }, 300); // Small delay for better UX
          } else {
            setCalories(result.data.calorieAmount || 0);
            setWater(result.data.waterIntakeAmount || 0);
          }
        } else {
          console.error("Failed to fetch intake data:", result.error);
          // Set default values or handle error state
          setCalories(0);
          setWater(0);
          setInitialLoad(false);
        }
      } catch (error) {
        console.error("Error fetching intake data:", error);
        // Set default values on error
        setCalories(0);
        setWater(0);
        setInitialLoad(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }

    const channelA = supabase
      .channel("supabase_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "CaloriesIntakeLog",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log(payload.new);
          const newRecord = payload.new as { calories: number };
          // Add the new calories to existing total
          setCalories(
            (prev) => prev + Number.parseFloat(newRecord.calories.toString())
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "WaterIntakeLog",
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log("Water update:", payload.new);
          const newRecord = payload.new as { amount: number };
          // Add the new water amount to existing total
          setWater(
            (prev) => prev + Number.parseFloat(newRecord.amount.toString())
          );
        }
      )
      .subscribe();

    console.log("after subscribing", channelA);

    return () => {
      console.log("closing connection");
      supabase.removeChannel(channelA);
    };
  }, [userId]);

  // format values
  const formatCalories = (c: number) => `${c} kcal`;
  const formatWater = (w: number) => `${w} ml`;

  return (
    <motion.div
      className="fixed top-0 left-0 w-full flex justify-center z-50 pointer-events-none"
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      exit={{ y: "-100%" }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      <motion.div
        className="relative inline-flex items-center space-x-2 sm:space-x-6 bg-primary text-primary-foreground
           dark:bg-secondary dark:text-secondary-foreground
           font-bold px-3 py-1.5 sm:px-8 sm:py-4 rounded-lg shadow-xl
           border border-primary dark:border-secondary
           pointer-events-auto backdrop-blur-sm text-xs sm:text-base"
        // Add subtle floating animation
        animate={{
          y: [0, -2, 0],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        {/* Ropes with subtle sway animation */}
        <motion.span
          className="absolute -top-12 left-3 h-12 w-px bg-foreground origin-top"
          animate={{ rotate: [-1, 1, -1] }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.span
          className="absolute -top-12 right-3 h-12 w-px bg-foreground origin-top"
          animate={{ rotate: [1, -1, 1] }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Pins */}
        <span className="absolute -top-1.5 left-2 w-3 h-3 bg-foreground rounded-full" />
        <span className="absolute -top-1.5 right-2 w-3 h-3 bg-foreground rounded-full" />

        {/* Loading state */}
        {isLoading ? (
          <motion.div
            className="flex items-center space-x-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <Flame className="w-5 h-5" />
            </motion.div>
            <span>Loading...</span>
          </motion.div>
        ) : (
          <motion.div
            className="flex items-center space-x-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatedMetric
              icon={<Flame className="w-5 h-5 text-orange-200" />}
              value={calories}
              formatter={formatCalories}
              label="calories"
            />

            <div className="w-px h-6 bg-current opacity-30" />

            <AnimatedMetric
              icon={<Droplet className="w-5 h-5 text-blue-300" />}
              value={water}
              formatter={formatWater}
              label="water"
            />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default HangingBanner;
