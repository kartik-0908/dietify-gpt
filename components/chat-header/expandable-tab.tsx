import React, { useState } from "react";
import {
  Plus,
  Droplet,
  Utensils,
  DumbbellIcon,
  ChevronLeft,
} from "lucide-react";

export default function ExpandableCircularButton() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const iconOptions = [
    {
      icon: Droplet,
      label: "Water Intake",
      color: "#3b82f6", // blue-500
      progress: 65, // e.g. 65% of your daily water goal
    },
    {
      icon: Utensils,
      label: "Calorie Intake",
      color: "#10b981", // green-500
      progress: 40, // e.g. 40% of your daily calories
    },
    {
      icon: DumbbellIcon,
      label: "Calories Burned",
      color: "#ef4444", // red-500
      progress: 30, // e.g. 30% of your burn target
    },
  ];

  return (
    <div className="relative">
      <div
        className={`
    relative
    transition-all duration-500 ease-in-out 
    ${isExpanded ? "w-48" : "w-12"} h-12
  `}
      >
        {/* Main container with gradient background always visible */}
        <div
          className={`
    relative w-12 h-12 bg-muted shadow-xl transition-all duration-500 ease-in-out border-1
    ${isExpanded ? "rounded-full" : "rounded-xl"}
  `}
        >
          {/* Expanded background container */}
          <div
            className={`
              absolute top-0  flex items-center justify-start
              transition-all duration-500 ease-in-out
              ${
                isExpanded
                  ? "w-48 h-12 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 rounded-full shadow-2xl opacity-100"
                  : "w-12 h-12 opacity-0"
              }
            `}
          >
            {/* Icons container - positioned to avoid the main button */}
            <div
              className={`
                flex items-center justify-start gap-2 pl-16 pr-2
                transition-all duration-500
                ${isExpanded ? "opacity-100 visible" : "opacity-0 invisible"}
              `}
            >
              {isExpanded &&
                iconOptions.map((option, index) => (
                  <button
                    key={option.label}
                    type="button"
                    className={`
                    p-2 rounded-full bg-gray-100 dark:bg-gray-700 transition-all duration-300
                    transform hover:scale-110 ${option.color} hover:text-white
                    ${
                      isExpanded
                        ? "translate-y-0 scale-100"
                        : "translate-y-2 scale-75"
                    }
                  `}
                    style={{
                      transitionDelay: isExpanded ? `${index * 80}ms` : "0ms",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Clicked ${option.label}`);
                    }}
                    title={option.label}
                  >
                    <option.icon size={20} />
                  </button>
                ))}
            </div>
          </div>

          {/* Main circular button - always positioned at the left */}
          <button
            type="button"
            onClick={toggleExpanded}
            className={`
      absolute z-20 w-12 h-12 rounded-full flex items-center justify-center
      bg-transparent transform
      transition-all duration-500 ease-in-out 
      hover:scale-110
     
    `}
            style={{
              transitionDelay: isExpanded
                ? "100ms"
                : "0ms" /* optional: delay so wrapper moves first */,
            }}
          >
            {/* Pulsing ring animation for closed state */}
            {/* {!isExpanded && (
              <>
                <span className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping" />
                <span className="absolute inset-0 rounded-full bg-white opacity-10 animate-ping animation-delay-200" />
              </>
            )} */}

            {/* Expanded state glow effect */}
            {isExpanded && (
              <span className="absolute inset-0 rounded-full bg-white opacity-30 animate-pulse" />
            )}

            {isExpanded && (
              <Plus
                size={20}
                className={`
        text-white transition-all duration-500 transform
        ${isExpanded ? "rotate-45" : "rotate-0"}
      `}
              />
            )}

            {!isExpanded && (
              <ChevronLeft
                size={20}
                className={`
        text-white transition-all duration-500 transform
       
      `}
              />
            )}

            {/* Plus icon with rotation */}
          </button>
        </div>

        {/* Floating particles animation - always active but different styles */}
        {/* <div className="absolute inset-0 pointer-events-none">
          {!isExpanded ? (
            <>
              <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-float-1" />
              <div className="absolute bottom-0 right-1/4 w-2 h-2 bg-pink-400 rounded-full animate-float-2" />
              <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-green-400 rounded-full animate-float-3" />
            </>
          ) : (
            <>
              <div className="absolute top-2 left-20 w-1 h-1 bg-blue-400 rounded-full animate-expanded-float-1" />
              <div className="absolute bottom-2 left-32 w-1 h-1 bg-purple-400 rounded-full animate-expanded-float-2" />
              <div className="absolute top-1/2 right-8 w-1 h-1 bg-pink-400 rounded-full animate-expanded-float-3" />
              <div className="absolute top-3 right-16 w-1 h-1 bg-yellow-400 rounded-full animate-expanded-float-1" />
            </>
          )}
        </div> */}
      </div>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes float-1 {
          0%,
          100% {
            transform: translate(-50%, 0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -18px) rotate(180deg);
            opacity: 1;
          }
        }

        @keyframes float-2 {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: translate(12px, -24px) rotate(-180deg);
            opacity: 1;
          }
        }

        @keyframes float-3 {
          0%,
          100% {
            transform: translate(0, -50%) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: translate(-18px, -50%) rotate(360deg);
            opacity: 1;
          }
        }

        @keyframes expanded-float-1 {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        @keyframes expanded-float-2 {
          0%,
          100% {
            transform: translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateX(8px);
            opacity: 1;
          }
        }

        @keyframes expanded-float-3 {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 1;
          }
        }

        .animate-float-1 {
          animation: float-1 3s ease-in-out infinite;
        }

        .animate-float-2 {
          animation: float-2 3s ease-in-out infinite 0.5s;
        }

        .animate-float-3 {
          animation: float-3 3s ease-in-out infinite 1s;
        }

        .animate-expanded-float-1 {
          animation: expanded-float-1 2s ease-in-out infinite;
        }

        .animate-expanded-float-2 {
          animation: expanded-float-2 2.5s ease-in-out infinite 0.3s;
        }

        .animate-expanded-float-3 {
          animation: expanded-float-3 2s ease-in-out infinite 0.6s;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
}
