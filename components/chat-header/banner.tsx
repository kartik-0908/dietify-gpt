"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Droplet, Flame, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { LoaderIcon } from "../icons";

// Simplified Animated Number Component - only counting effect
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

  useEffect(() => {
    if (value === displayValue) return;

    const startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;
    const duration = 800; // Fixed duration for consistent feel
    const startTime = Date.now();

    const animateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        const currentValue = startValue + difference * progress;
        setDisplayValue(Math.round(currentValue));
        requestAnimationFrame(animateValue);
      } else {
        setDisplayValue(endValue);
      }
    };

    requestAnimationFrame(animateValue);
  }, [value, displayValue]);

  return <span className={className}>{formatter(displayValue)}</span>;
};

// Simplified Metric Component - no extra animations
const SimpleMetric = ({
  icon,
  value,
  formatter,
}: {
  icon: React.ReactNode;
  value: number;
  formatter: (n: number) => string;
}) => {
  return (
    <div className="flex items-center space-x-2">
      {icon}
      <AnimatedNumber
        value={value}
        formatter={formatter}
        className="font-mono tracking-wider"
      />
    </div>
  );
};

const HangingBanner = () => {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const [calories, setCalories] = useState<number>(0);
  const [water, setWater] = useState<number>(0);
  const [carbs, setCarbs] = useState<number>(0);
  const [proteins, setProteins] = useState<number>(0);
  const [fats, setFats] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/user/intake?userId=${userId}`);
        const result = await response.json();

        if (result.success) {
          if (initialLoad) {
            setTimeout(() => {
              setCalories(result.data.calorieAmount || 0);
              setWater(result.data.waterIntakeAmount || 0);
              setCarbs(result.data.carbsAmount || 0);
              setProteins(result.data.proteinsAmount || 0);
              setFats(result.data.fatsAmount || 0);
              setInitialLoad(false);
            }, 300);
          } else {
            setCalories(result.data.calorieAmount || 0);
            setWater(result.data.waterIntakeAmount || 0);
            setCarbs(result.data.carbsAmount || 0);
            setProteins(result.data.proteinsAmount || 0);
            setFats(result.data.fatsAmount || 0);
          }
        } else {
          console.error("Failed to fetch intake data:", result.error);
          setCalories(0);
          setWater(0);
          setCarbs(0);
          setProteins(0);
          setFats(0);
          setInitialLoad(false);
        }
      } catch (error) {
        console.error("Error fetching intake data:", error);
        setCalories(0);
        setWater(0);
        setCarbs(0);
        setProteins(0);
        setFats(0);
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
          const newRecord = payload.new as {
            calories: number;
            carbs: number;
            proteins: number;
            fats: number;
          };
          setCalories(
            (prev) => prev + Number.parseFloat(newRecord.calories.toString())
          );
          setCarbs(
            (prev) => prev + Number.parseFloat(newRecord.carbs.toString())
          );
          setProteins(
            (prev) => prev + Number.parseFloat(newRecord.proteins.toString())
          );
          setFats(
            (prev) => prev + Number.parseFloat(newRecord.fats.toString())
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

  const formatCalories = (c: number) => `${c} kcal`;
  const formatWater = (w: number) => `${w} ml`;
  const formatCarbs = (c: number) => `${c}g carbs`;
  const formatProteins = (p: number) => `${p}g protein`;
  const formatFats = (f: number) => `${f}g fat`;

  return (
    <motion.div
      className="fixed top-0 left-0 w-full flex justify-center z-50 pointer-events-none"
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
    >
      <div
        className="relative flex flex-col items-center w-[65vw] max-w-[420px] bg-primary text-primary-foreground
    dark:bg-secondary dark:text-secondary-foreground font-bold px-2 py-1.5 sm:px-8 sm:py-4 rounded-lg shadow-xl
    border border-primary dark:border-secondary pointer-events-auto backdrop-blur-sm text-xs sm:text-base"
        style={{ textAlign: "center" }}
      >
        {/* Static ropes */}
        <span className="absolute -top-12 left-3 h-12 w-px bg-foreground" />
        <span className="absolute -top-12 right-3 h-12 w-px bg-foreground" />

        {/* Static pins */}
        <span className="absolute -top-1.5 left-2 w-3 h-3 bg-foreground rounded-full" />
        <span className="absolute -top-1.5 right-2 w-3 h-3 bg-foreground rounded-full" />

        {isLoading ? (
          <div className="flex items-center space-x-4 justify-center w-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <LoaderIcon />
            </motion.div>
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {/* Main row: Calories & Water */}
            <div className="flex items-center space-x-4 sm:space-x-6 w-full justify-center text-center">
              <SimpleMetric
                icon={<Flame className="w-5 h-5 text-orange-200" />}
                value={calories}
                formatter={formatCalories}
              />
              <div className="w-px h-6 bg-current opacity-30" />
              <SimpleMetric
                icon={<Droplet className="w-5 h-5 text-blue-300" />}
                value={water}
                formatter={formatWater}
              />
            </div>
            {/* Macros row: Carbs, Proteins, Fats */}
            <div className="flex items-center space-x-3 sm:space-x-6 mt-1 text-[10px] sm:text-xs opacity-80 w-full justify-center text-center">
              <SimpleMetric
                icon={<UtensilsCrossed className="w-4 h-4 text-green-400" />}
                value={carbs}
                formatter={formatCarbs}
              />
              <SimpleMetric
                icon={<UtensilsCrossed className="w-4 h-4 text-blue-400" />}
                value={proteins}
                formatter={formatProteins}
              />
              <SimpleMetric
                icon={<UtensilsCrossed className="w-4 h-4 text-yellow-400" />}
                value={fats}
                formatter={formatFats}
              />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default HangingBanner;
