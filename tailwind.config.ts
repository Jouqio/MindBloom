// ============================================================
// MindBloom Design System — Tailwind CSS Config
// File: tailwind.config.ts
// Version: 1.0 | May 2025
// ============================================================

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    // ── Override defaults ─────────────────────────────────────
    fontFamily: {
      sans: [
        "var(--font-sans)",
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "sans-serif",
      ],
      mono: [
        "var(--font-mono)",
        "ui-monospace",
        "SF Mono",
        "Fira Code",
        "monospace",
      ],
      serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
    },
    extend: {
      // ── Colors ──────────────────────────────────────────────
      colors: {
        // Semantic
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          placeholder: "var(--color-text-placeholder)",
          inverse: "var(--color-text-inverse)",
          disabled: "var(--color-text-disabled)",
        },
        bg: {
          primary: "var(--color-background-primary)",
          secondary: "var(--color-background-secondary)",
          tertiary: "var(--color-background-tertiary)",
          elevated: "var(--color-background-elevated)",
          overlay: "var(--color-background-overlay)",
        },
        border: {
          tertiary: "var(--color-border-tertiary)",
          secondary: "var(--color-border-secondary)",
          primary: "var(--color-border-primary)",
          focus: "var(--color-border-focus)",
        },

        // Brand (Purple)
        brand: {
          50: "#EEEDFE",
          100: "#CECBF6",
          200: "#AFA9EC",
          400: "#7F77DD",
          600: "#534AB7",
          800: "#3C3489",
          900: "#26215C",
        },

        // Full categorical ramps
        purple: {
          50: "#EEEDFE",
          100: "#CECBF6",
          200: "#AFA9EC",
          400: "#7F77DD",
          600: "#534AB7",
          800: "#3C3489",
          900: "#26215C",
        },
        teal: {
          50: "#E1F5EE",
          100: "#9FE1CB",
          200: "#5DCAA5",
          400: "#1D9E75",
          600: "#0F6E56",
          800: "#085041",
          900: "#04342C",
        },
        coral: {
          50: "#FAECE7",
          100: "#F5C4B3",
          200: "#F0997B",
          400: "#D85A30",
          600: "#993C1D",
          800: "#712B13",
          900: "#4A1B0C",
        },
        pink: {
          50: "#FBEAF0",
          100: "#F4C0D1",
          200: "#ED93B1",
          400: "#D4537E",
          600: "#993556",
          800: "#72243E",
          900: "#4B1528",
        },
        blue: {
          50: "#E6F1FB",
          100: "#B5D4F4",
          200: "#85B7EB",
          400: "#378ADD",
          600: "#185FA5",
          800: "#0C447C",
          900: "#042C53",
        },
        green: {
          50: "#EAF3DE",
          100: "#C0DD97",
          200: "#97C459",
          400: "#639922",
          600: "#3B6D11",
          800: "#27500A",
          900: "#173404",
        },
        amber: {
          50: "#FAEEDA",
          100: "#FAC775",
          200: "#EF9F27",
          400: "#EF9F27",
          600: "#BA7517",
          800: "#854F0B",
          900: "#412402",
        },
        red: {
          50: "#FCEBEB",
          100: "#F7C1C1",
          200: "#F09595",
          400: "#E24B4A",
          600: "#A32D2D",
          800: "#791F1F",
          900: "#501313",
        },
        gray: {
          50: "#F1EFE8",
          100: "#D3D1C7",
          200: "#B4B2A9",
          400: "#888780",
          600: "#5F5E5A",
          800: "#444441",
          900: "#2C2C2A",
        },

        // Mood
        mood: {
          happy: "#1D9E75",
          calm: "#378ADD",
          excited: "#EF9F27",
          anxious: "#D85A30",
          stressed: "#E24B4A",
          emotional: "#7F77DD",
          tired: "#888780",
        },
      },

      // ── Spacing ─────────────────────────────────────────────
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "2.5": "10px",
        "3": "12px",
        "3.5": "14px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "9": "36px",
        "10": "40px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        // Layout
        nav: "60px",
        sidebar: "240px",
      },

      // ── Border Radius ────────────────────────────────────────
      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "8px", // DEFAULT for buttons/inputs
        lg: "12px", // cards
        xl: "16px", // sheets/modals
        "2xl": "20px",
        full: "9999px", // pills
      },

      // ── Font Size ────────────────────────────────────────────
      fontSize: {
        display: [
          "1.5rem",
          { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "500" },
        ],
        h1: [
          "1.25rem",
          { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "500" },
        ],
        h2: [
          "1.125rem",
          { lineHeight: "1.35", letterSpacing: "-0.005em", fontWeight: "500" },
        ],
        h3: ["1rem", { lineHeight: "1.4", fontWeight: "500" }],
        h4: ["0.9375rem", { lineHeight: "1.4", fontWeight: "500" }],
        lg: ["0.9375rem", { lineHeight: "1.6" }],
        base: ["0.875rem", { lineHeight: "1.6" }],
        sm: ["0.8125rem", { lineHeight: "1.6" }],
        xs: ["0.75rem", { lineHeight: "1.55" }],
        "2xs": ["0.6875rem", { lineHeight: "1.5" }],
        "3xs": ["0.625rem", { lineHeight: "1.5", letterSpacing: "0.06em" }],
      },

      // ── Font Weight ──────────────────────────────────────────
      fontWeight: {
        regular: "400",
        medium: "500",
        semi: "600",
      },

      // ── Animation ────────────────────────────────────────────
      transitionDuration: {
        instant: "0ms",
        fast: "100ms",
        base: "150ms",
        slow: "250ms",
        slower: "400ms",
        slowest: "600ms",
      },
      transitionTimingFunction: {
        default: "cubic-bezier(0.4, 0, 0.2, 1)",
        in: "cubic-bezier(0.4, 0, 1, 1)",
        out: "cubic-bezier(0, 0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      keyframes: {
        "mood-bounce": {
          "0%": { transform: "scale(0.8)" },
          "60%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        "check-bounce": {
          "0%": { transform: "scale(0.7)" },
          "60%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        "earned-pop": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "70%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "bubble-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.92) translateY(8px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        skeleton: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "typing-dot": {
          "0%, 100%": { opacity: "0.3", transform: "translateY(0)" },
          "50%": { opacity: "1", transform: "translateY(-4px)" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateY(100vh) rotate(720deg)",
            opacity: "0",
          },
        },
      },
      animation: {
        "mood-bounce": "mood-bounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "check-bounce": "check-bounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "earned-pop": "earned-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "bubble-in": "bubble-in 0.25s cubic-bezier(0, 0, 0.2, 1)",
        "sheet-up": "sheet-up 0.25s cubic-bezier(0, 0, 0.2, 1)",
        "modal-in": "modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        skeleton: "skeleton 1.4s ease-in-out infinite",
        "typing-1": "typing-dot 1.2s ease-in-out infinite",
        "typing-2": "typing-dot 1.2s ease-in-out 0.18s infinite",
        "typing-3": "typing-dot 1.2s ease-in-out 0.36s infinite",
        "confetti-fall": "confetti-fall 2.5s ease-in forwards",
      },

      // ── Box Shadow ───────────────────────────────────────────
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
        sm: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
        md: "0 4px 8px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)",
        lg: "0 8px 16px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)",
        focus: "0 0 0 3px rgba(127, 119, 221, 0.20)",
        brand: "0 0 0 3px rgba(127, 119, 221, 0.18)",
      },

      // ── Backdrop Blur ────────────────────────────────────────
      backdropBlur: {
        glass: "20px",
        "glass-sm": "12px",
      },

      // ── Z-index ──────────────────────────────────────────────
      zIndex: {
        dropdown: "100",
        sticky: "200",
        sidebar: "250",
        modal: "300",
        popover: "350",
        toast: "400",
        tooltip: "500",
      },

      // ── Max Width ────────────────────────────────────────────
      maxWidth: {
        prose: "65ch",
        content: "1200px",
        sidebar: "240px",
      },

      // ── Height ───────────────────────────────────────────────
      height: {
        nav: "60px",
      },

      // ── Background Image (gradients) ─────────────────────────
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #7F77DD 0%, #D4537E 100%)",
        "gradient-calm": "linear-gradient(135deg, #1D9E75 0%, #378ADD 100%)",
        "gradient-streak": "linear-gradient(135deg, #EF9F27 0%, #D85A30 100%)",
        "gradient-surface":
          "linear-gradient(180deg, var(--color-background-primary) 0%, var(--color-background-secondary) 100%)",
      },
    },
  },
  plugins: [
    // Custom plugin for glass utilities
    ({ addUtilities, theme }: any) => {
      addUtilities({
        ".glass": {
          background: "var(--glass-background)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "0.5px solid var(--glass-border)",
        },
        ".glass-sm": {
          background: "var(--glass-background-mid)",
          backdropFilter: "var(--glass-blur-sm)",
          WebkitBackdropFilter: "var(--glass-blur-sm)",
          border: "0.5px solid var(--glass-border)",
        },
        ".text-gradient-brand": {
          background: "linear-gradient(135deg, #7F77DD 0%, #D4537E 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        },
        ".border-half": {
          borderWidth: "0.5px",
        },
        ".sr-only": {
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          borderWidth: "0",
        },
      });
    },
  ],
};

export default config;
