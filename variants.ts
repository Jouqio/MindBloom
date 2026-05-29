// ============================================================
// MindBloom Motion Design System — Framer Motion Variants
// File: src/lib/motion/variants.ts
// Version: 1.0 | May 2025
// ============================================================

import type { Variants, Transition } from 'framer-motion'

// ── Easing presets ────────────────────────────────────────────
export const ease = {
  /** Standard UI transitions — fast out, slow in */
  default:   [0.4, 0, 0.2, 1] as const,
  /** Enter: fast out */
  out:       [0, 0, 0.2, 1] as const,
  /** Exit: slow in */
  in:        [0.4, 0, 1, 1] as const,
  /** Spring-like overshoot for playful elements */
  spring:    [0.34, 1.56, 0.64, 1] as const,
  /** Gentle bounce for achievements and rewards */
  bounce:    [0.68, -0.55, 0.265, 1.55] as const,
  /** Smooth sinusoidal for ambient animations */
  sinusoidal: 'easeInOut' as const,
} as const

// ── Duration presets (milliseconds) ──────────────────────────
export const dur = {
  instant: 0,
  fast:    0.10,
  base:    0.15,
  slow:    0.25,
  slower:  0.40,
  slowest: 0.60,
  breath:  4.00,   // breathing circle expand/contract
  aurora:  20.0,   // ambient background loop
} as const

// ─────────────────────────────────────────────────────────────
// 1. PAGE TRANSITION
// Apple-level: subtle Y shift + opacity. Never slides full-width.
// ─────────────────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
}

export const pageTransition: Transition = {
  duration: dur.slow,
  ease:     ease.out,
}

/** Wrap every page component with this */
export const PageWrapper = {
  variants: pageVariants,
  initial:  'initial',
  animate:  'animate',
  exit:     'exit',
  transition: pageTransition,
}

// ─────────────────────────────────────────────────────────────
// 2. HERO ANIMATION
// Staggered children: badge → title → subtitle → CTA
// ─────────────────────────────────────────────────────────────
export const heroContainerVariants: Variants = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren:  0.08,
      delayChildren:    0.05,
    }
  }
}

export const heroChildVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,
    transition: { duration: dur.slower, ease: ease.out }
  }
}

/** CTA button gets spring instead of ease for "aliveness" */
export const heroCTAVariants: Variants = {
  hidden:  { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: dur.slower, ease: ease.spring }
  }
}

// ─────────────────────────────────────────────────────────────
// 3. FLOATING ORB ANIMATION
// Three orbs with different speeds and offsets for organic feel.
// CSS animation preferred for performance (no JS per frame).
// ─────────────────────────────────────────────────────────────
export const orbConfigs = [
  {
    id: 'orb-purple',
    color: 'radial-gradient(circle at 40% 35%, #AFA9EC, #EEEDFE40)',
    size: 480,
    animate: {
      x: [0, 28, -18, 0],
      y: [0, -22, 32, 0],
      scale: [1, 1.06, 0.94, 1],
    },
    transition: {
      duration: 18,
      ease:     ease.sinusoidal,
      repeat:   Infinity,
      repeatType: 'loop' as const,
    }
  },
  {
    id: 'orb-teal',
    color: 'radial-gradient(circle at 40% 35%, #9FE1CB, #E1F5EE40)',
    size: 360,
    animate: {
      x: [0, -22, 18, 0],
      y: [0, 24, -18, 0],
      scale: [1, 0.92, 1.08, 1],
    },
    transition: {
      duration: 22,
      ease:     ease.sinusoidal,
      repeat:   Infinity,
      repeatType: 'loop' as const,
      delay:    3,
    }
  },
  {
    id: 'orb-amber',
    color: 'radial-gradient(circle at 40% 35%, #FAC775, #FAEEDA40)',
    size: 280,
    animate: {
      x: [0, 16, -12, 0],
      y: [0, -16, 12, 0],
      scale: [1, 1.12, 0.9, 1],
    },
    transition: {
      duration: 26,
      ease:     ease.sinusoidal,
      repeat:   Infinity,
      repeatType: 'loop' as const,
      delay:    7,
    }
  },
]

/** Shared style for all orbs */
export const orbStyle = {
  position:    'absolute' as const,
  borderRadius: '50%',
  filter:      'blur(80px)',
  opacity:     0.20,
  pointerEvents: 'none' as const,
  willChange:  'transform',
}

// ─────────────────────────────────────────────────────────────
// 4. AURORA BACKGROUND
// Canvas-based sinusoidal movement. See AuroraBackground.tsx.
// These are the config values passed to the canvas renderer.
// ─────────────────────────────────────────────────────────────
export const auroraConfig = {
  orbs: [
    { baseX: 0.15, baseY: 0.30, radius: 0.55, color: [175, 169, 236] as [number,number,number], speed: 0.40 },
    { baseX: 0.80, baseY: 0.60, radius: 0.42, color: [29,  158, 117] as [number,number,number], speed: 0.30 },
    { baseX: 0.50, baseY: 0.80, radius: 0.38, color: [239, 159, 39]  as [number,number,number], speed: 0.25 },
    { baseX: 0.25, baseY: 0.70, radius: 0.30, color: [212, 83,  126] as [number,number,number], speed: 0.35 },
  ],
  opacityLight: 0.20,
  opacityDark:  0.10,
  tickSpeed:    0.008,   // radians per frame at 60fps
}

// ─────────────────────────────────────────────────────────────
// 5. MOOD SELECTION ANIMATION
// Emoji node: spring scale on select. Big emoji: pop in.
// ─────────────────────────────────────────────────────────────
export const moodNodeVariants: Variants = {
  idle:     { scale: 1 },
  hover:    { scale: 1.18, transition: { duration: dur.fast, ease: ease.spring } },
  selected: { scale: 1.22, transition: { duration: 0.20, ease: ease.spring } },
  tap:      { scale: 0.90, transition: { duration: 0.08 } },
}

export const moodBigEmojiVariants: Variants = {
  hidden:  { scale: 0.6, opacity: 0 },
  visible: {
    scale:   1,
    opacity: 1,
    transition: { duration: 0.30, ease: ease.spring },
  },
  exit:    {
    scale:   0.80,
    opacity: 0,
    transition: { duration: 0.12, ease: ease.in },
  }
}

export const moodSliderColors = {
  1:  '#E24B4A',  2: '#D85A30',  3: '#D85A30',  4: '#D85A30',
  5:  '#888780',  6: '#1D9E75',  7: '#1D9E75',  8: '#1D9E75',
  9:  '#1D9E75', 10: '#1D9E75',
} as const

// ─────────────────────────────────────────────────────────────
// 6. JOURNAL STEP TRANSITION
// Horizontal slide: forward = exit left, enter right.
// Back = exit right, enter left.
// ─────────────────────────────────────────────────────────────
export const getStepVariants = (direction: 1 | -1): Variants => ({
  initial: {
    opacity: 0,
    x:       direction * 32,
  },
  animate: {
    opacity: 1,
    x:       0,
    transition: { duration: 0.28, ease: ease.out },
  },
  exit: {
    opacity: 0,
    x:       direction * -24,
    transition: { duration: 0.20, ease: ease.in },
  }
})

export const stepProgressDotVariants: Variants = {
  inactive: { scale: 1,   backgroundColor: 'var(--color-border-secondary)' },
  active:   { scale: 1.3, backgroundColor: 'var(--color-brand-400)',
    transition: { duration: 0.20, ease: ease.spring }
  },
  done:     { scale: 1,   backgroundColor: 'var(--color-success-400)',
    transition: { duration: 0.15, ease: ease.default }
  },
}

// ─────────────────────────────────────────────────────────────
// 7. AI TYPING ANIMATION
// Three dots with staggered bounce. Then stream text char-by-char.
// ─────────────────────────────────────────────────────────────
export const typingContainerVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.18 }
  }
}

export const typingDotVariants: Variants = {
  visible: {
    opacity: [0.3, 1, 0.3],
    y:       [0, -4, 0],
    transition: {
      duration:   1.2,
      ease:       ease.sinusoidal,
      repeat:     Infinity,
      repeatType: 'loop',
    }
  }
}

export const chatBubbleVariants: Variants = {
  hidden:  { opacity: 0, y: 8,  scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: dur.slow, ease: ease.out }
  }
}

/** AI bubble height animates as text streams in */
export const bubbleHeightTransition: Transition = {
  duration: 0.08,
  ease:     ease.out,
}

/** Streaming config: ms per character */
export const streamConfig = {
  msPerChar:     20,   // average typing speed feel
  msPerCharFast: 12,   // for short responses
  initialDelay:  1400, // typing dots show duration before text
}

// ─────────────────────────────────────────────────────────────
// 8. SAVE SUCCESS ANIMATION
// Overlay → check icon → title → subtitle → buttons (staggered)
// ─────────────────────────────────────────────────────────────
export const saveOverlayVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.90 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.35, ease: ease.spring },
  },
  exit:    { opacity: 0, scale: 0.92,
    transition: { duration: 0.25, ease: ease.in }
  }
}

export const saveCheckVariants: Variants = {
  hidden:  { scale: 0 },
  visible: {
    scale: 1,
    transition: { duration: 0.40, ease: ease.spring, delay: 0.10 },
  }
}

export const saveContentContainerVariants: Variants = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.10, delayChildren: 0.30 }
  }
}

export const saveContentItemVariants: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0,
    transition: { duration: 0.30, ease: ease.out }
  }
}

// ─────────────────────────────────────────────────────────────
// 9. CONFETTI REWARD
// Pure DOM/CSS animation. Not Framer Motion (performance).
// This config drives the vanilla JS confetti engine.
// ─────────────────────────────────────────────────────────────
export const confettiConfig = {
  save: {
    count:    50,
    colors:   ['#7F77DD', '#1D9E75', '#EF9F27', '#D4537E', '#D85A30', '#378ADD'],
    duration: { min: 1.8, max: 3.2 },
    spread:   80,          // percent of viewport width
    origin:   0.5,         // horizontal center
  },
  streak: {
    count:    20,
    colors:   ['#EF9F27', '#D85A30', '#FAC775'],
    duration: { min: 1.5, max: 2.5 },
    spread:   60,
    origin:   0.5,
  },
  gratitude: {
    count:    8,
    colors:   ['#1D9E75', '#9FE1CB', '#E1F5EE'],
    duration: { min: 1.2, max: 2.0 },
    spread:   40,
    origin:   0.5,
  },
  achievement: {
    count:    20,
    colors:   ['#EF9F27', '#FAC775', '#F5C4B3', '#7F77DD'],
    duration: { min: 2.0, max: 3.5 },
    spread:   70,
    origin:   0.5,
  },
} as const

// ─────────────────────────────────────────────────────────────
// 10. ACHIEVEMENT UNLOCK ANIMATION
// Card → icon pop → ripple rings → text stagger → confetti
// ─────────────────────────────────────────────────────────────
export const achievementCardVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.85, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.50, ease: ease.spring },
  }
}

export const achievementIconVariants: Variants = {
  hidden:  { scale: 0 },
  visible: {
    scale: 1,
    transition: { duration: 0.50, ease: ease.spring, delay: 0.20 },
  }
}

export const rippleVariants: Variants = {
  hidden:  { scale: 0.5, opacity: 0.8 },
  visible: (delay: number) => ({
    scale:   2.5,
    opacity: 0,
    transition: { duration: 0.70, ease: ease.out, delay },
  })
}

export const achievementTextContainerVariants: Variants = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.45 }
  }
}

export const achievementTextVariants: Variants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0,
    transition: { duration: 0.30, ease: ease.out }
  }
}

// ─────────────────────────────────────────────────────────────
// 11. BREATHING CIRCLE ANIMATION
// The most important animation in MindBloom.
// Size lerps smoothly — ease-in-out is critical (not linear).
// ─────────────────────────────────────────────────────────────
export type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle'

export const breathSizes: Record<BreathPhase, { circle: number; ring1: number; ring2: number }> = {
  idle:      { circle: 140, ring1: 180, ring2: 200 },
  inhale:    { circle: 180, ring1: 225, ring2: 255 },
  'hold-in': { circle: 180, ring1: 225, ring2: 255 },
  exhale:    { circle: 126, ring1: 165, ring2: 185 },
  'hold-out':{ circle: 126, ring1: 165, ring2: 185 },
}

export const breathColors: Record<BreathPhase, string> = {
  idle:      'rgba(127, 119, 221, 0.15)',
  inhale:    'rgba(127, 119, 221, 0.22)',
  'hold-in': 'rgba(127, 119, 221, 0.22)',
  exhale:    'rgba(29,  158, 117, 0.18)',
  'hold-out':'rgba(29,  158, 117, 0.15)',
}

export const breathTransition: Transition = {
  duration: dur.breath,
  ease:     ease.sinusoidal,  // critical — linear feels mechanical
}

export const breathPhaseLabels: Record<BreathPhase, string> = {
  idle:       'Klik untuk mulai',
  inhale:     'Tarik nafas...',
  'hold-in':  'Tahan...',
  exhale:     'Buang nafas...',
  'hold-out': 'Tahan...',
}

export const breathPhaseDuration: Record<Exclude<BreathPhase,'idle'>, number> = {
  inhale:     4,
  'hold-in':  4,
  exhale:     4,
  'hold-out': 4,
}

export const breathSequence: Exclude<BreathPhase,'idle'>[] =
  ['inhale', 'hold-in', 'exhale', 'hold-out']

// ─────────────────────────────────────────────────────────────
// 12. CHART ANIMATION
// Bar charts: stagger scaleY from bottom.
// Line charts: stroke-dashoffset path draw.
// ─────────────────────────────────────────────────────────────
export const barContainerVariants: Variants = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0 }
  }
}

export const barVariants: Variants = {
  hidden:  { scaleY: 0, opacity: 0.4 },
  visible: {
    scaleY:  1,
    opacity: 1,
    transition: { duration: 0.50, ease: ease.spring },
  }
}

export const barWrapperStyle = {
  transformOrigin: 'bottom',
  originY:         1,   // Framer Motion: bottom anchor
}

export const lineChartVariants: Variants = {
  hidden:  { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity:    1,
    transition: { duration: 0.80, ease: ease.out },
  }
}

export const lineFillVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1,
    transition: { duration: 0.40, ease: ease.out, delay: 0.60 }
  }
}

export const tooltipVariants: Variants = {
  hidden:  { opacity: 0, y: 4, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1,
    transition: { duration: dur.base, ease: ease.out }
  }
}

// ─────────────────────────────────────────────────────────────
// 13. DASHBOARD WIDGET ANIMATION
// Grid stagger + count-up numbers + progress ring draw.
// ─────────────────────────────────────────────────────────────
export const dashboardContainerVariants: Variants = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
}

export const widgetVariants: Variants = {
  hidden:  { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.40, ease: ease.spring },
  }
}

export const widgetHoverVariants: Variants = {
  rest:  { y: 0, boxShadow: 'var(--shadow-xs)' },
  hover: { y: -2, boxShadow: 'var(--shadow-md)',
    transition: { duration: dur.slow, ease: ease.out }
  }
}

/** Count-up animation config for number counters */
export const countUpConfig = {
  duration:  1.0,
  easing:    (t: number) => 1 - Math.pow(1 - t, 3), // ease-out cubic
}

export const progressRingConfig = {
  duration:  1.2,
  ease:      ease.out,
  delay:     0.30,
}

// ─────────────────────────────────────────────────────────────
// ACCESSIBILITY: useReducedMotion hook integration
// ─────────────────────────────────────────────────────────────

/**
 * Returns accessibility-safe transition config.
 * When reduced motion is preferred, all durations become 0.01s
 * and y/scale transforms are removed.
 */
export function getAccessibleVariants<T extends Variants>(
  variants: T,
  reducedMotion: boolean
): T {
  if (!reducedMotion) return variants

  const safe: Variants = {}
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === 'object' && value !== null) {
      const { x, y, scale, rotate, ...rest } = value as Record<string, unknown>
      safe[key] = {
        ...rest,
        transition: { duration: 0.01 },
      }
    } else {
      safe[key] = value
    }
  }
  return safe as T
}

/**
 * Completely disable animation in reduced-motion mode.
 * Use for confetti, aurora, orbs — purely decorative.
 */
export function getDecorativeTransition(reducedMotion: boolean): Transition {
  if (reducedMotion) return { duration: 0 }
  return { duration: dur.slower, ease: ease.sinusoidal }
}
