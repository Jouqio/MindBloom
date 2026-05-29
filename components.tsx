// ============================================================
// MindBloom Motion Components — All 13 Animations
// File: src/components/motion/index.tsx
// ============================================================

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotionn,
  useMotionValue,
  useTransform,
  animate,
  type MotionStyle,
} from "framer-motion";
import {
  pageVariants,
  pageTransition,
  heroContainerVariants,
  heroChildVariants,
  heroCTAVariants,
  orbConfigs,
  orbStyle,
  auroraConfig,
  moodNodeVariants,
  moodBigEmojiVariants,
  getStepVariants,
  stepProgressDotVariants,
  typingContainerVariants,
  typingDotVariants,
  chatBubbleVariants,
  streamConfig,
  saveOverlayVariants,
  saveCheckVariants,
  saveContentContainerVariants,
  saveContentItemVariants,
  confettiConfig,
  achievementCardVariants,
  achievementIconVariants,
  rippleVariants,
  achievementTextContainerVariants,
  achievementTextVariants,
  breathSizes,
  breathColors,
  breathTransition,
  breathPhaseLabels,
  breathPhaseDuration,
  breathSequence,
  type BreathPhase,
  barContainerVariants,
  barVariants,
  barWrapperStyle,
  lineChartVariants,
  tooltipVariants,
  dashboardContainerVariants,
  widgetVariants,
  widgetHoverVariants,
  countUpConfig,
  progressRingConfig,
  getAccessibleVariants,
  ease,
  dur,
} from "./variants";

// ─────────────────────────────────────────────────────────────
// 1. PAGE WRAPPER
// ─────────────────────────────────────────────────────────────
export function PageWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={getAccessibleVariants(pageVariants, !!prefersReducedMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={prefersReducedMotion ? { duration: 0.01 } : pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. HERO SECTION
// ─────────────────────────────────────────────────────────────
export function HeroSection({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? {} : heroContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function HeroChild({
  children,
  isCTA = false,
  className,
}: {
  children: React.ReactNode;
  isCTA?: boolean;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const variants = isCTA ? heroCTAVariants : heroChildVariants;

  return (
    <motion.div
      variants={prefersReducedMotion ? {} : variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. FLOATING ORBs
// ─────────────────────────────────────────────────────────────
export function FloatingOrbs() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // Static decorative blobs — no animation
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {orbConfigs.map((orb) => (
          <div
            key={orb.id}
            style={{
              ...orbStyle,
              width: orb.size,
              height: orb.size,
              background: orb.color,
              top: orb.id === "orb-purple" ? -120 : undefined,
              bottom: orb.id === "orb-teal" ? -80 : undefined,
              left: orb.id === "orb-purple" ? -80 : undefined,
              right: orb.id === "orb-teal" ? -60 : undefined,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {orbConfigs.map((orb, i) => (
        <motion.div
          key={orb.id}
          style={{
            ...orbStyle,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            // Position each orb differently
            top: i === 0 ? -120 : i === 2 ? "50%" : undefined,
            bottom: i === 1 ? -80 : undefined,
            left: i === 0 ? -80 : i === 2 ? "30%" : undefined,
            right: i === 1 ? -60 : undefined,
          }}
          animate={orb.animate}
          transition={orb.transition}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. AURORA BACKGROUND (Canvas-based)
// ─────────────────────────────────────────────────────────────
export function AuroraBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const tRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // Pause when tab hidden
    function handleVisibility() {
      if (document.hidden) cancelAnimationFrame(rafRef.current!);
      else draw();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      auroraConfig.orbs.forEach((orb) => {
        const ox =
          orb.baseX + Math.sin(tRef.current * orb.speed + orb.baseY * 3) * 0.12;
        const oy =
          orb.baseY +
          Math.cos(tRef.current * orb.speed * 0.8 + orb.baseX * 2) * 0.09;

        const grd = ctx.createRadialGradient(
          ox * canvas.width,
          oy * canvas.height,
          0,
          ox * canvas.width,
          oy * canvas.height,
          orb.radius * Math.min(canvas.width, canvas.height),
        );
        const [r, g, b] = orb.color;
        grd.addColorStop(
          0,
          `rgba(${r},${g},${b},${auroraConfig.opacityLight})`,
        );
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      tRef.current += auroraConfig.tickSpeed;
      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current!);
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    // Static gradient fallback
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-0 ${className}`}
        style={{
          background:
            "radial-gradient(ellipse at 15% 30%, rgba(175,169,236,0.12), transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(29,158,117,0.08), transparent 60%)",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 w-full h-full ${className}`}
      style={{ willChange: "transform" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// 5. MOOD PICKER
// ─────────────────────────────────────────────────────────────
interface MoodOption {
  value: number;
  emoji: string;
  label: string;
  color: string;
}

export function MoodPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const moods: MoodOption[] = [
    { value: 1, emoji: "😭", label: "Sangat berat", color: "#E24B4A" },
    { value: 3, emoji: "😔", label: "Kurang baik", color: "#D85A30" },
    { value: 5, emoji: "😐", label: "Biasa saja", color: "#888780" },
    { value: 7, emoji: "😊", label: "Baik", color: "#1D9E75" },
    { value: 9, emoji: "😄", label: "Sangat senang", color: "#1D9E75" },
    { value: 10, emoji: "😍", label: "Luar biasa!", color: "#1D9E75" },
  ];
  const current = moods.find((m) => m.value === value) ?? moods[2];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Big emoji display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.emoji}
          variants={prefersReducedMotion ? {} : moodBigEmojiVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ fontSize: "3rem", lineHeight: 1 }}
          role="img"
          aria-label={current.label}
        >
          {current.emoji}
        </motion.div>
      </AnimatePresence>

      {/* Emoji row */}
      <div className="flex gap-2" role="radiogroup" aria-label="Pilih mood">
        {moods.map((m) => (
          <motion.button
            key={m.value}
            variants={prefersReducedMotion ? {} : moodNodeVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            animate={value === m.value ? "selected" : "idle"}
            onClick={() => onChange(m.value)}
            role="radio"
            aria-checked={value === m.value}
            aria-label={m.label}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              fontSize: "1.1rem",
              border: `0.5px solid ${value === m.value ? m.color : "var(--color-border-tertiary)"}`,
              background:
                value === m.value
                  ? m.color + "22"
                  : "var(--color-background-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {m.emoji}
          </motion.button>
        ))}
      </div>

      {/* Label */}
      <motion.span
        key={current.label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}
        aria-live="polite"
      >
        {current.label}
      </motion.span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. JOURNAL STEP TRANSITION
// ─────────────────────────────────────────────────────────────
export function JournalStep({
  children,
  stepKey,
  direction,
}: {
  children: React.ReactNode;
  stepKey: string | number;
  direction: 1 | -1;
}) {
  const prefersReducedMotion = useReducedMotion();
  const variants = getStepVariants(direction);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        variants={prefersReducedMotion ? {} : variants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. AI TYPING INDICATOR + STREAMING BUBBLE
// ─────────────────────────────────────────────────────────────
export function AITypingIndicator() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div
        style={{
          display: "flex",
          gap: 4,
          alignItems: "center",
          padding: "2px 0",
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--color-text-tertiary)",
          }}
        />
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--color-text-tertiary)",
          }}
        />
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--color-text-tertiary)",
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={typingContainerVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
        padding: "2px 0",
      }}
      aria-label="Bloom sedang mengetik"
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          variants={typingDotVariants}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--color-text-tertiary)",
          }}
        />
      ))}
    </motion.div>
  );
}

export function AIStreamingBubble({ content }: { content: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? {} : chatBubbleVariants}
      initial="hidden"
      animate="visible"
      layout // animates height as text grows
      transition={{ layout: { duration: 0.08, ease: ease.out } }}
      style={{
        padding: "10px 13px",
        borderRadius: 13,
        borderBottomLeftRadius: 3,
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        fontSize: 13,
        lineHeight: 1.6,
        maxWidth: "82%",
      }}
      aria-live="polite"
    >
      {content}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        style={{ marginLeft: 2 }}
        aria-hidden="true"
      >
        |
      </motion.span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. SAVE SUCCESS OVERLAY
// ─────────────────────────────────────────────────────────────
export function SaveSuccessOverlay({
  isVisible,
  onDismiss,
}: {
  isVisible: boolean;
  onDismiss: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={prefersReducedMotion ? {} : saveOverlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label="Jurnal berhasil tersimpan"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-lg)",
            zIndex: 10,
          }}
        >
          {/* Check icon */}
          <motion.div
            variants={prefersReducedMotion ? {} : saveCheckVariants}
            initial="hidden"
            animate="visible"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--color-background-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>

          {/* Content */}
          <motion.div
            variants={prefersReducedMotion ? {} : saveContentContainerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <motion.h3
              variants={saveContentItemVariants}
              style={{ fontSize: 16, fontWeight: 500, margin: 0 }}
            >
              Jurnal tersimpan!
            </motion.h3>
            <motion.p
              variants={saveContentItemVariants}
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              Streak 🔥 hari ini · Tanaman baru tumbuh 🌱
            </motion.p>
            <motion.div
              variants={saveContentItemVariants}
              style={{ display: "flex", gap: 8, marginTop: 4 }}
            >
              <button
                onClick={onDismiss}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-primary)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Lihat taman
              </button>
              <button
                onClick={onDismiss}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--color-text-primary)",
                  color: "var(--color-background-primary)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Buka AI Coach
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. CONFETTI ENGINE (vanilla DOM, not Framer Motion)
// ─────────────────────────────────────────────────────────────
export function fireConfetti(type: keyof typeof confettiConfig = "save") {
  if (typeof window === "undefined") return;
  // Check reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const config = confettiConfig[type];

  for (let i = 0; i < config.count; i++) {
    setTimeout(() => {
      const el = document.createElement("div");
      const isCircle = Math.random() > 0.5;
      const isThin = Math.random() > 0.75;
      const color =
        config.colors[Math.floor(Math.random() * config.colors.length)];
      const duration =
        config.duration.min +
        Math.random() * (config.duration.max - config.duration.min);
      const spread = 50 - config.spread / 2 + Math.random() * config.spread;

      el.style.cssText = [
        "position:fixed",
        `width:${isCircle ? 7 : isThin ? 3 : 8}px`,
        `height:${isCircle ? 7 : isThin ? 14 : 7}px`,
        `border-radius:${isCircle ? "50%" : "2px"}`,
        `background:${color}`,
        `top:-10px`,
        `left:${spread}vw`,
        `z-index:9999`,
        "pointer-events:none",
        `animation:mbConfettiFall ${duration}s ease-in forwards`,
        `transform:rotate(${Math.random() * 360}deg)`,
      ].join(";");

      document.body.appendChild(el);
      setTimeout(() => el.remove(), (duration + 0.5) * 1000);
    }, i * 40);
  }
}

// Inject keyframe once
if (typeof document !== "undefined") {
  const id = "mb-confetti-style";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes mbConfettiFall {
        0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
        80%  { opacity: 0.8; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─────────────────────────────────────────────────────────────
// 10. ACHIEVEMENT UNLOCK
// ─────────────────────────────────────────────────────────────
export function AchievementCard({
  icon,
  name,
  description,
  xpReward,
  isVisible,
}: {
  icon: string;
  name: string;
  description: string;
  xpReward: number;
  isVisible: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isVisible) fireConfetti("achievement");
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={prefersReducedMotion ? {} : achievementCardVariants}
          initial="hidden"
          animate="visible"
          role="alertdialog"
          aria-live="assertive"
          aria-label={`Achievement unlocked: ${name}`}
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: 20,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ripple rings */}
          {[0, 0.15].map((delay, i) => (
            <motion.div
              key={i}
              variants={prefersReducedMotion ? {} : rippleVariants}
              custom={delay}
              initial="hidden"
              animate="visible"
              style={{
                position: "absolute",
                inset: 0,
                margin: "auto",
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: "1.5px solid var(--color-warning-400)",
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Icon */}
          <motion.div
            variants={prefersReducedMotion ? {} : achievementIconVariants}
            initial="hidden"
            animate="visible"
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "var(--color-warning-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: "1.75rem",
            }}
            role="img"
            aria-label={`Badge ${name}`}
          >
            {icon}
          </motion.div>

          {/* Text */}
          <motion.div
            variants={
              prefersReducedMotion ? {} : achievementTextContainerVariants
            }
            initial="hidden"
            animate="visible"
          >
            <motion.h3
              variants={achievementTextVariants}
              style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px" }}
            >
              {name}
            </motion.h3>
            <motion.p
              variants={achievementTextVariants}
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              {description}
            </motion.p>
            <motion.span
              variants={achievementTextVariants}
              style={{
                display: "inline-block",
                marginTop: 12,
                padding: "4px 14px",
                borderRadius: 100,
                background: "var(--color-warning-50)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-warning)",
              }}
            >
              + {xpReward} XP
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// 11. BREATHING CIRCLE
// ─────────────────────────────────────────────────────────────
export function BreathingCircle() {
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const countRef = useRef<ReturnType<typeof setInterval>>();
  const phaseRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  const currentSizes = breathSizes[phase];
  const currentColor = breathColors[phase];

  const runPhase = useCallback(() => {
    const p = breathSequence[phaseRef.current % 4];
    setPhase(p);
    const dur4 = breathPhaseDuration[p];
    setCountdown(dur4);

    clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(
      () => {
        if (phaseRef.current % 4 === 3) setCycles((c) => c + 1);
        phaseRef.current++;
        runPhase();
      },
      dur4 * 1000 + 100,
    );
  }, []);

  const toggle = () => {
    if (running) {
      clearTimeout(timerRef.current);
      clearInterval(countRef.current);
      setPhase("idle");
      setRunning(false);
      setCountdown(4);
    } else {
      phaseRef.current = 0;
      setRunning(true);
      runPhase();
    }
  };

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      clearInterval(countRef.current);
    },
    [],
  );

  const transition = prefersReducedMotion
    ? { duration: 0.01 }
    : breathTransition;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
      }}
    >
      {/* Rings */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Outer ring */}
        <motion.div
          animate={{ width: currentSizes.ring2, height: currentSizes.ring2 }}
          transition={transition}
          style={{
            position: "absolute",
            borderRadius: "50%",
            border: "0.5px solid var(--color-border-secondary)",
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />
        {/* Mid ring */}
        <motion.div
          animate={{ width: currentSizes.ring1, height: currentSizes.ring1 }}
          transition={transition}
          style={{
            position: "absolute",
            borderRadius: "50%",
            border: "0.5px solid var(--color-border-primary)",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
        {/* Main circle */}
        <motion.button
          animate={{
            width: currentSizes.circle,
            height: currentSizes.circle,
            background: currentColor,
          }}
          transition={transition}
          onClick={toggle}
          aria-label={
            running ? "Hentikan latihan pernapasan" : "Mulai latihan pernapasan"
          }
          aria-describedby="breath-phase-desc"
          style={{
            borderRadius: "50%",
            border: "0.5px solid var(--color-border-primary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            cursor: "pointer",
          }}
        >
          <span
            id="breath-phase-desc"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
            }}
          >
            {breathPhaseLabels[phase]}
          </span>
          <span
            style={{ fontSize: "2.5rem", fontWeight: 500, lineHeight: 1 }}
            aria-live="polite"
          >
            {countdown}
          </span>
        </motion.button>
      </div>

      <p
        style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
        aria-live="polite"
      >
        {cycles > 0 ? `${cycles} siklus selesai` : "4-4-4-4 box breathing"}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 12. ANIMATED BAR CHART
// ─────────────────────────────────────────────────────────────
interface BarData {
  label: string;
  value: number;
  color: string;
  maxValue?: number;
}

export function AnimatedBarChart({
  data,
  height = 120,
}: {
  data: BarData[];
  height: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const max = Math.max(...data.map((d) => d.value));

  return (
    <motion.div
      variants={prefersReducedMotion ? {} : barContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}
      role="img"
      aria-label={`Bar chart: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
    >
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            height: "100%",
            justifyContent: "flex-end",
          }}
        >
          <motion.div
            variants={prefersReducedMotion ? {} : barVariants}
            style={{
              ...barWrapperStyle,
              width: "100%",
              height: `${(d.value / max) * (height - 20)}px`,
              background: d.color,
              borderRadius: "4px 4px 0 0",
              minHeight: 4,
            }}
            aria-hidden="true"
          />
          <span style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>
            {d.label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// 13. DASHBOARD WIDGET GRID
// ─────────────────────────────────────────────────────────────
export function DashboardWidgets({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? {} : dashboardContainerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16,
      }}
    >
      {children}
    </motion.div>
  );
}

export function DashboardWidget({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? {} : widgetVariants}
      whileHover={prefersReducedMotion ? {} : widgetHoverVariants.hover}
      initial={prefersReducedMotion ? { opacity: 1 } : undefined}
      animate={prefersReducedMotion ? { opacity: 1 } : undefined}
      className={className}
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "16px",
      }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// COUNT-UP HOOK
// ─────────────────────────────────────────────────────────────
export function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let startTime: number;
    let raf: number;

    function step(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = countUpConfig.easing(progress);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, prefersReducedMotion]);

  return value;
}

// ─────────────────────────────────────────────────────────────
// PROGRESS RING COMPONENT
// ─────────────────────────────────────────────────────────────
export function ProgressRing({
  value,
  max = 100,
  size = 72,
  strokeWidth = 6,
  color = "#7F77DD",
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const displayValue = useCountUp(value, 1200);
  const percentage = value / max;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border-tertiary)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - percentage) }}
          transition={
            prefersReducedMotion
              ? { duration: 0.01 }
              : {
                  duration: progressRingConfig.duration,
                  ease: progressRingConfig.ease,
                  delay: progressRingConfig.delay,
                }
          }
          style={{ rotate: -90, transformOrigin: "50% 50%" }}
        />
      </svg>
      <div
        style={{ position: "absolute", textAlign: "center", lineHeight: 1.2 }}
      >
        <span
          style={{ fontSize: size * 0.22, fontWeight: 500, color }}
          aria-live="polite"
        >
          {prefersReducedMotion ? value : displayValue}
        </span>
        {label && (
          <span
            style={{
              display: "block",
              fontSize: 9,
              color: "var(--color-text-tertiary)",
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
