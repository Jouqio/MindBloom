const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  LevelFormat,
  TabStopType,
  PageBreak,
  SimpleField,
} = require("docx");
const fs = require("fs");

const W = 9360;
const C = {
  indigo: "5B4FE8",
  violet: "7C6EF5",
  pink: "FF7B8A",
  green: "1DB97A",
  amber: "F0A500",
  red: "E85B5B",
  teal: "0D9488",
  blue: "2563EB",
  slate: "475569",
  dark: "0F172A",
  white: "FFFFFF",
  nearW: "FAFAFA",
  light: "F8FAFC",
  lightI: "EEF0FE",
  lightG: "ECFDF5",
  lightA: "FFFBEB",
  gray: "F3F4F6",
  code: "1E293B",
};

const b1 = { style: BorderStyle.SINGLE, size: 1, color: "E2E8F0" };
const borders = { top: b1, bottom: b1, left: b1, right: b1 };
const nb = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: nb, bottom: nb, left: nb, right: nb };

const sp = (n = 1) =>
  Array.from(
    { length: n },
    () =>
      new Paragraph({
        children: [new TextRun("")],
        spacing: { before: 0, after: 0 },
      }),
  );

const PB = () => new Paragraph({ children: [new PageBreak()] });

function hr(color = C.indigo) {
  return new Paragraph({
    spacing: { before: 180, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color, space: 1 } },
    children: [new TextRun("")],
  });
}

function H(text, level = HeadingLevel.HEADING_2, color = C.indigo) {
  const sz = {
    [HeadingLevel.HEADING_1]: 44,
    [HeadingLevel.HEADING_2]: 30,
    [HeadingLevel.HEADING_3]: 24,
    [HeadingLevel.HEADING_4]: 22,
  };
  const sp2 = {
    [HeadingLevel.HEADING_1]: 480,
    [HeadingLevel.HEADING_2]: 300,
    [HeadingLevel.HEADING_3]: 200,
    [HeadingLevel.HEADING_4]: 160,
  };
  return new Paragraph({
    heading: level,
    spacing: { before: sp2[level] || 160, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        color,
        font: "Arial",
        size: sz[level] || 22,
      }),
    ],
  });
}

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before || 60, after: opts.after || 60 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: opts.size || 21,
        bold: opts.bold || false,
        italic: opts.italic || false,
        color: opts.color || C.slate,
      }),
    ],
  });
}

function B(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 30, after: 30 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: C.slate })],
  });
}

function N(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 30, after: 30 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: C.slate })],
  });
}

function code(lines) {
  const arr = Array.isArray(lines) ? lines : [lines];
  return arr.map(
    (line) =>
      new Paragraph({
        spacing: { before: 20, after: 20 },
        indent: { left: 360 },
        shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
        children: [
          new TextRun({
            text: line,
            font: "Courier New",
            size: 18,
            color: C.code,
          }),
        ],
      }),
  );
}

function callout(text, fill = C.lightI, borderColor = C.indigo) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: {
      left: {
        style: BorderStyle.SINGLE,
        size: 14,
        color: borderColor,
        space: 1,
      },
    },
    indent: { left: 320, right: 240 },
    shading: { type: ShadingType.CLEAR, fill },
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: 21,
        color: C.dark,
        italic: true,
      }),
    ],
  });
}

function tag(text, fill = C.indigo) {
  return new TextRun({
    text: ` ${text} `,
    font: "Arial",
    size: 18,
    bold: true,
    color: C.white,
    shading: { type: ShadingType.CLEAR, fill },
  });
}

function secHeader(emoji, title, color = C.indigo) {
  return new Paragraph({
    spacing: { before: 600, after: 160 },
    children: [
      new TextRun({
        text: `${emoji}  ${title}`,
        font: "Arial",
        size: 52,
        bold: true,
        color,
      }),
    ],
  });
}

function T(headers, rows, widths, hFill = C.indigo) {
  const total = widths.reduce((a, b) => a + b, 0);
  const makeCell = (c, isHeader, ri) =>
    new TableCell({
      borders,
      width: { size: widths[0], type: WidthType.DXA },
      shading: {
        type: ShadingType.CLEAR,
        fill: isHeader ? hFill : ri % 2 === 0 ? C.white : C.nearW,
      },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      verticalAlign: VerticalAlign.TOP,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: String(c.text || c),
              font: "Arial",
              size: 19,
              bold: c.bold || isHeader || false,
              color: c.color || (isHeader ? C.white : C.dark),
              italic: c.italic || false,
            }),
          ],
        }),
      ],
    });
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map(
          (h, i) =>
            new TableCell({
              borders,
              shading: { type: ShadingType.CLEAR, fill: hFill },
              width: { size: widths[i], type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: h,
                      font: "Arial",
                      size: 19,
                      bold: true,
                      color: C.white,
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
      ...rows.map(
        (r, ri) =>
          new TableRow({
            children: r.map(
              (c, ci) =>
                new TableCell({
                  borders,
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: ri % 2 === 0 ? C.white : C.nearW,
                  },
                  width: { size: widths[ci], type: WidthType.DXA },
                  margins: { top: 75, bottom: 75, left: 110, right: 110 },
                  verticalAlign: VerticalAlign.TOP,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(c.text || c),
                          font: "Arial",
                          size: 19,
                          bold: c.bold || false,
                          color: c.color || C.dark,
                          italic: c.italic || false,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });
}

// ═══════════════ COVER ═══════════════════════════════════════════
const cover = [
  ...sp(5),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: "🌱", font: "Arial", size: 120 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({
        text: "MindBloom",
        font: "Arial",
        size: 96,
        bold: true,
        color: C.indigo,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
    children: [
      new TextRun({
        text: "Full Stack Technical Documentation",
        font: "Arial",
        size: 40,
        color: C.violet,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 60 },
    children: [
      new TextRun({
        text: "Database · API · Edge Functions · TypeScript · Deployment",
        font: "Arial",
        size: 26,
        italic: true,
        color: C.slate,
      }),
    ],
  }),
  ...sp(2),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 40 },
    children: [
      tag("55 Tables", C.indigo),
      new TextRun("   "),
      tag("65+ RLS Policies", C.violet),
      new TextRun("   "),
      tag("25+ Functions", C.teal),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 20, after: 0 },
    children: [
      tag("80+ Indexes", C.green),
      new TextRun("   "),
      tag("13 Migration Files", C.amber),
      new TextRun("   "),
      tag("TypeScript Types", C.slate),
    ],
  }),
  ...sp(3),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "v2.0  ·  May 2025  ·  Confidential",
        font: "Arial",
        size: 22,
        italic: true,
        color: C.slate,
      }),
    ],
  }),
  ...sp(2),
  PB(),
];

// ═══════════════ S1 — ARCHITECTURE ═══════════════════════════════
const s1 = [
  secHeader("🏗️", "SECTION 1 — FULL STACK ARCHITECTURE"),
  hr(),
  H("1.1  Technology Stack", HeadingLevel.HEADING_2),
  T(
    ["Layer", "Technology", "Version", "Purpose"],
    [
      [
        "Frontend Framework",
        "Next.js",
        "15 (App Router)",
        "SSR, routing, API routes, Server Actions",
      ],
      ["Language", "TypeScript", "5.x", "Type safety across all layers"],
      [
        "Styling",
        "Tailwind CSS + Shadcn/UI",
        "3.x / latest",
        "Utility classes, accessible components",
      ],
      [
        "Animation",
        "Framer Motion",
        "11.x",
        "Page transitions, micro-interactions, 60fps",
      ],
      [
        "State Management",
        "Zustand",
        "4.x",
        "Client state, draft persistence, feature flags",
      ],
      [
        "Form Handling",
        "React Hook Form + Zod",
        "7.x / 3.x",
        "Validation, schema-driven forms",
      ],
      ["Charts", "Recharts", "2.x", "Analytics visualizations, responsive"],
      [
        "Database",
        "PostgreSQL",
        "15",
        "Relational + vector + full-text search",
      ],
      [
        "Backend-as-a-Service",
        "Supabase",
        "Latest",
        "Auth, DB, Storage, Realtime, Edge Functions",
      ],
      [
        "Authentication",
        "Supabase Auth",
        "Built-in",
        "Google OAuth, Email/Password, JWT",
      ],
      [
        "File Storage",
        "Supabase Storage",
        "Built-in",
        "Memory book PDFs, user avatars",
      ],
      [
        "AI Model — Coach",
        "OpenAI GPT-4o",
        "2024-11",
        "Streaming AI Reflection Coach",
      ],
      [
        "AI Model — Analysis",
        "OpenAI GPT-4o-mini",
        "2024-07",
        "Emotion analysis (cost-efficient)",
      ],
      [
        "Embeddings",
        "text-embedding-3-small",
        "v1",
        "1536-dim vectors for semantic search",
      ],
      [
        "Vector DB",
        "pgvector (Supabase)",
        "0.7+",
        "IVFFlat indexes on VECTOR(1536) columns",
      ],
      [
        "Payments",
        "Midtrans",
        "v2",
        "Indonesian payment gateway (cards, e-wallet, VA)",
      ],
      [
        "Email",
        "Resend + React Email",
        "Latest",
        "Transactional emails, beautiful templates",
      ],
      [
        "Push Notifications",
        "FCM (Android) / APNs (iOS)",
        "—",
        "Via Supabase Edge Functions",
      ],
      [
        "Mobile",
        "React Native + Expo",
        "SDK 51",
        "iOS and Android from single codebase",
      ],
      [
        "Deployment — Web",
        "Vercel",
        "Pro",
        "Edge network, preview deployments, CI/CD",
      ],
      ["Deployment — Mobile", "Expo EAS", "—", "OTA updates, build pipeline"],
      [
        "Monitoring",
        "Sentry + Vercel Analytics",
        "—",
        "Error tracking, performance, vitals",
      ],
      [
        "Scheduled Jobs",
        "Supabase pg_cron",
        "—",
        "Nightly analytics refresh, streak reminders",
      ],
    ],
    [1800, 1800, 900, 4860],
    C.indigo,
  ),
  ...sp(1),
  H("1.2  Folder Structure", HeadingLevel.HEADING_2),
  ...code([
    "mindbloom-web/",
    "├── app/                         # Next.js 15 App Router",
    "│   ├── (auth)/                  # login, signup, onboarding",
    "│   │   ├── login/page.tsx",
    "│   │   ├── signup/page.tsx",
    "│   │   └── onboarding/page.tsx",
    "│   ├── (dashboard)/             # Protected pages",
    "│   │   ├── dashboard/page.tsx",
    "│   │   ├── journal/             # /journal/new, /journal/[id]",
    "│   │   ├── garden/page.tsx",
    "│   │   ├── coach/page.tsx",
    "│   │   ├── analytics/page.tsx",
    "│   │   ├── habits/page.tsx",
    "│   │   ├── life-wheel/page.tsx",
    "│   │   ├── memory/page.tsx",
    "│   │   ├── insights/page.tsx",
    "│   │   └── settings/page.tsx",
    "│   ├── api/                     # API Route Handlers",
    "│   │   ├── journals/route.ts         # GET, POST",
    "│   │   ├── journals/[id]/route.ts    # GET, PATCH, DELETE",
    "│   │   ├── dashboard/route.ts",
    "│   │   ├── mood/calendar/route.ts",
    "│   │   ├── ai/coach/route.ts         # SSE streaming",
    "│   │   ├── ai/insights/route.ts",
    "│   │   ├── habits/route.ts",
    "│   │   ├── life-wheel/route.ts",
    "│   │   ├── payments/create/route.ts",
    "│   │   └── payments/webhook/route.ts",
    "│   ├── layout.tsx               # Root layout, providers",
    "│   └── page.tsx                 # Landing page",
    "├── components/",
    "│   ├── ui/                      # Shadcn base components",
    "│   ├── journal/                 # JournalForm, StepCard, MoodSlider",
    "│   │   ├── JournalForm.tsx      # 15-step orchestrator",
    "│   │   ├── steps/               # Step1Date, Step2Mood, ... Step15Prayer",
    "│   │   ├── MoodSlider.tsx",
    "│   │   ├── EmotionPicker.tsx",
    "│   │   ├── BatteryEnergy.tsx",
    "│   │   └── GratitudeList.tsx",
    "│   ├── dashboard/               # Widgets, heatmap, streak",
    "│   ├── garden/                  # EmotionalGarden, PlantSVG",
    "│   ├── ai/                      # CoachChat, InsightCard, TypingIndicator",
    "│   ├── analytics/               # MoodChart, LineChart, DonutChart",
    "│   └── shared/                  # Button, Card, Modal, Toast, Navbar",
    "├── lib/",
    "│   ├── supabase/                # client.ts, server.ts, middleware.ts",
    "│   ├── ai/                      # openai.ts, prompts.ts, streaming.ts",
    "│   ├── hooks/                   # useJournal, useDashboard, useStreak",
    "│   └── utils/                   # date.ts, format.ts, validation.ts",
    "├── store/                       # Zustand: journalStore, uiStore",
    "├── types/                       # database.ts (generated), app.ts",
    "├── styles/                      # globals.css, tokens.css",
    "├── middleware.ts                # Auth guard + session refresh",
    "├── next.config.ts",
    "supabase/",
    "├── migrations/                  # 000-012 SQL files",
    "├── functions/                   # Edge Functions",
    "│   ├── process-journal/index.ts # AI analysis pipeline",
    "│   ├── ai-coach/index.ts        # Streaming coach",
    "│   ├── midtrans-webhook/index.ts",
    "│   └── send-notifications/index.ts",
    "└── config.toml",
  ]),
  ...sp(1),
  PB(),
];

// ═══════════════ S2 — DATABASE COMPLETE TABLE REFERENCE ══════════
const s2 = [
  secHeader("🗄️", "SECTION 2 — COMPLETE TABLE REFERENCE"),
  hr(),
  callout(
    "55 tables across 11 clusters. All tables have RLS enabled. Triggers handle automation (streaks, garden, XP). Partitioned tables for high-volume data. pgvector for AI semantic retrieval.",
  ),
  ...sp(1),
  T(
    [
      "#",
      "Table Name",
      "Cluster",
      "Rows/Day (est.)",
      "Primary Index",
      "Auto-Trigger",
    ],
    [
      [
        "1",
        "profiles",
        "Core",
        "~50 new",
        "PK id",
        "handle_new_user → auto-creates prefs + referral",
      ],
      [
        "2",
        "user_preferences",
        "Core",
        "~100 updates",
        "UNIQUE user_id",
        "auto-created by handle_new_user()",
      ],
      [
        "3",
        "user_devices",
        "Core",
        "~20 upserts",
        "UNIQUE(user_id, device_id)",
        "—",
      ],
      ["4", "onboarding_answers", "Core", "~50 inserts", "user_id", "—"],
      [
        "5",
        "sync_queue",
        "Core",
        "~500 mobile ops",
        "user_id + resolved",
        "trim after 7 days (pg_cron)",
      ],
      [
        "6",
        "journal_entries",
        "Journal",
        "~200 final + drafts",
        "user_id + entry_date",
        "TSV update, mood_category, completion_pct, streak++, garden plant, XP",
      ],
      ["7", "journal_emotions", "Journal", "~800", "entry_id", "—"],
      ["8", "gratitude_items", "Journal", "~600", "entry_id", "—"],
      ["9", "journal_affirmations", "Journal", "~300", "entry_id", "—"],
      ["10", "mood_logs", "Journal", "~400", "user_id + logged_at", "—"],
      [
        "11",
        "journal_embeddings",
        "Journal",
        "~200",
        "ivfflat vector + entry_id",
        "Content hash prevents re-gen",
      ],
      [
        "12",
        "streaks",
        "Gamification",
        "~200 updates",
        "UNIQUE user_id",
        "Updated by journal trigger",
      ],
      [
        "13",
        "streak_history",
        "Gamification",
        "~20",
        "user_id",
        "Appended when streak breaks",
      ],
      [
        "14",
        "user_achievements",
        "Gamification",
        "~50",
        "user_id + achievement_id",
        "Server-only awards",
      ],
      [
        "15",
        "achievement_definitions",
        "Catalog",
        "0 (seed only)",
        "slug UNIQUE",
        "—",
      ],
      [
        "16",
        "user_xp",
        "Gamification",
        "~200 updates",
        "UNIQUE user_id",
        "Updated by award_xp()",
      ],
      [
        "17",
        "xp_transactions",
        "Gamification",
        "~200",
        "user_id",
        "Written by award_xp function",
      ],
      ["18", "coach_sessions", "AI", "~100", "user_id + started_at", "—"],
      [
        "19",
        "coach_messages",
        "AI",
        "~500",
        "session_id + sequence_no",
        "TSV + embedding update",
      ],
      [
        "20",
        "ai_user_memory",
        "AI",
        "~60 (every 3rd journal)",
        "user_id + ivfflat embedding",
        "Server-only via Edge Fn",
      ],
      [
        "21",
        "emotion_analysis",
        "AI",
        "~200",
        "UNIQUE entry_id",
        "Written by Edge Fn async",
      ],
      [
        "22",
        "ai_insights",
        "AI",
        "~200",
        "user_id + period + category",
        "Upserted by Edge Fn",
      ],
      [
        "23",
        "reflection_prompts",
        "Catalog",
        "0 (seed only)",
        "category + is_active",
        "—",
      ],
      [
        "24",
        "gardens",
        "Garden",
        "~200 updates",
        "UNIQUE user_id",
        "grow_garden_plant trigger",
      ],
      [
        "25",
        "garden_plants",
        "Garden",
        "~200",
        "user_id + garden_id",
        "Grown by journal trigger",
      ],
      [
        "26",
        "garden_events",
        "Garden",
        "~30",
        "user_id + occurred_at",
        "Level-up events",
      ],
      ["27", "habits", "Habits", "~20", "user_id + is_archived", "—"],
      [
        "28",
        "habit_logs",
        "Habits",
        "~300",
        "habit_id + log_date",
        "UNIQUE(habit_id, log_date)",
      ],
      [
        "29",
        "habit_correlations",
        "Habits",
        "~20 weekly",
        "user_id + computed_at",
        "pg_cron weekly",
      ],
      [
        "30",
        "life_wheel_entries",
        "Life Wheel",
        "~20",
        "user_id + entry_date",
        "overall_score trigger",
      ],
      [
        "31",
        "breathing_sessions",
        "Wellness",
        "~100",
        "user_id + completed_at",
        "—",
      ],
      [
        "32",
        "soundscape_sessions",
        "Wellness",
        "~150",
        "user_id + started_at",
        "—",
      ],
      [
        "33",
        "memory_books",
        "Memory",
        "~1000/month batch",
        "UNIQUE(user_id, year, month)",
        "pg_cron 1st of month",
      ],
      [
        "34",
        "annual_reviews",
        "Memory",
        "~10K/year batch",
        "UNIQUE(user_id, year)",
        "pg_cron Jan 1",
      ],
      [
        "35",
        "plan_definitions",
        "Catalog",
        "0 (seed only)",
        "UNIQUE slug",
        "—",
      ],
      [
        "36",
        "subscriptions",
        "Billing",
        "~10",
        "UNIQUE active per user_id",
        "sync_plan_to_profile trigger",
      ],
      [
        "37",
        "payment_transactions",
        "Billing",
        "~10",
        "midtrans_order_id UNIQUE",
        "audit_trigger",
      ],
      ["38", "invoices", "Billing", "~10", "invoice_number UNIQUE", "—"],
      ["39", "coupons", "Billing", "0 (admin only)", "code UNIQUE", "—"],
      [
        "40",
        "coupon_redemptions",
        "Billing",
        "~5",
        "UNIQUE(coupon_id, user_id)",
        "—",
      ],
      [
        "41",
        "notification_templates",
        "Catalog",
        "0 (seed only)",
        "slug UNIQUE",
        "—",
      ],
      [
        "42",
        "notification_queue",
        "Notifications",
        "~500",
        "user_id + scheduled_at",
        "pg_cron send daily",
      ],
      [
        "43",
        "notification_schedules",
        "Notifications",
        "~50 updates",
        "UNIQUE(user_id, type, channel)",
        "—",
      ],
      [
        "44",
        "activity_events",
        "Observability",
        "~5K (partitioned)",
        "user_id + event_name",
        "Monthly partitions",
      ],
      [
        "45",
        "app_sessions",
        "Observability",
        "~200",
        "user_id + started_at",
        "—",
      ],
      [
        "46",
        "audit_logs",
        "Observability",
        "~300 (partitioned)",
        "user_id + table_name",
        "Quarterly partitions",
      ],
      [
        "47",
        "security_events",
        "Observability",
        "~50",
        "user_id + created_at",
        "—",
      ],
      [
        "48",
        "data_requests",
        "Observability",
        "~5",
        "user_id + status",
        "hard_delete_expired_accounts()",
      ],
      ["49", "feature_flags", "Config", "0 (seed only)", "slug UNIQUE", "—"],
      [
        "50",
        "user_feature_flags",
        "Config",
        "~10",
        "UNIQUE(user_id, flag_id)",
        "—",
      ],
      [
        "51",
        "referral_codes",
        "Config",
        "~50 new",
        "UNIQUE user_id + code",
        "create_referral_code trigger",
      ],
      ["52", "referrals", "Config", "~20", "UNIQUE referee_id", "—"],
      [
        "53",
        "search_history",
        "Config",
        "~200",
        "user_id + searched_at",
        "trim_search_history (keep last 50)",
      ],
      ["54", "app_config", "Config", "0 (admin only)", "key PK", "—"],
      [
        "55",
        "journal_templates",
        "Config",
        "0 (seed only)",
        "category + is_public",
        "—",
      ],
    ],
    [300, 1600, 1100, 1400, 2000, 2960],
    C.slate,
  ),
  ...sp(1),
  PB(),
];

// ═══════════════ S3 — API DESIGN ═══════════════════════════════
const s3 = [
  secHeader("🌐", "SECTION 3 — REST API DESIGN"),
  hr(),
  callout(
    "All API routes live under /api/. Authentication via Supabase JWT cookie (SSR) or Authorization: Bearer header (mobile). All responses: { data, error, count? }.",
  ),
  ...sp(1),
  T(
    ["Method", "Endpoint", "Auth", "Request Body / Params", "Response"],
    [
      // Auth
      [
        "GET",
        "/api/auth/callback",
        "Public",
        "code (from OAuth)",
        "Redirect + set session cookie",
      ],
      ["POST", "/api/auth/logout", "Required", "—", "{ success }"],
      // Journals
      [
        "GET",
        "/api/journals",
        "Required",
        "?limit&offset&month&year",
        "{ data: JournalEntry[], count }",
      ],
      [
        "POST",
        "/api/journals",
        "Required",
        "JournalInsert (Zod validated)",
        "201 { data: JournalEntry }",
      ],
      [
        "GET",
        "/api/journals/[id]",
        "Required",
        "—",
        "{ data: JournalEntryFull }",
      ],
      [
        "PATCH",
        "/api/journals/[id]",
        "Required",
        "Partial<JournalInsert>",
        "{ data: JournalEntry }",
      ],
      [
        "DELETE",
        "/api/journals/[id]",
        "Required",
        "—",
        "{ success } (soft delete)",
      ],
      // Dashboard
      ["GET", "/api/dashboard", "Required", "—", "{ data: DashboardData }"],
      [
        "GET",
        "/api/mood/calendar",
        "Required",
        "?year&month",
        "{ data: MoodCalendarDay[] }",
      ],
      [
        "POST",
        "/api/mood/log",
        "Required",
        "{ mood_score, emoji, note }",
        "201 { data: MoodLog }",
      ],
      // AI
      [
        "POST",
        "/api/ai/coach",
        "Required",
        "{ session_id, message, user_id }",
        "SSE stream: data: { delta }\\ndata: [DONE]",
      ],
      [
        "POST",
        "/api/ai/coach/session",
        "Required",
        "{ entry_id? }",
        "201 { data: CoachSession }",
      ],
      [
        "GET",
        "/api/ai/insights",
        "Required",
        "?period=daily|weekly|monthly",
        "{ data: AIInsight[] }",
      ],
      [
        "PATCH",
        "/api/ai/insights/[id]",
        "Required",
        "{ seen_at?, was_helpful? }",
        "{ data: AIInsight }",
      ],
      // Habits
      ["GET", "/api/habits", "Required", "—", "{ data: Habit[] }"],
      ["POST", "/api/habits", "Required", "HabitInsert", "201 { data: Habit }"],
      [
        "PATCH",
        "/api/habits/[id]",
        "Required",
        "Partial<HabitInsert>",
        "{ data: Habit }",
      ],
      [
        "POST",
        "/api/habits/[id]/log",
        "Required",
        "{ completed, note? }",
        "201 { data: HabitLog }",
      ],
      [
        "GET",
        "/api/habits/[id]/correlation",
        "Required",
        "—",
        "{ data: HabitCorrelation }",
      ],
      // Life Wheel
      ["GET", "/api/life-wheel", "Required", "—", "{ data: LifeWheelEntry }"],
      [
        "POST",
        "/api/life-wheel",
        "Required",
        "{ scores: LifeWheelScores }",
        "201 { data: LifeWheelEntry }",
      ],
      // Analytics
      [
        "GET",
        "/api/analytics/weekly",
        "Required",
        "—",
        "{ data: WeeklyStats[] }",
      ],
      [
        "GET",
        "/api/analytics/monthly",
        "Required",
        "?year&month",
        "{ data: MonthlyStats }",
      ],
      // Memory
      ["GET", "/api/memory/books", "Required", "—", "{ data: MemoryBook[] }"],
      [
        "GET",
        "/api/memory/books/[id]",
        "Required",
        "—",
        "{ data: MemoryBook }",
      ],
      // Search
      [
        "GET",
        "/api/search",
        "Required",
        "?q&type=text|semantic",
        "{ data: SearchResult[] }",
      ],
      // Payments
      [
        "POST",
        "/api/payments/create",
        "Required",
        "{ plan, interval }",
        "{ token, redirect_url }",
      ],
      [
        "POST",
        "/api/payments/webhook",
        "Midtrans sig",
        "Midtrans webhook payload",
        "{ received: true }",
      ],
      // Settings
      ["GET", "/api/settings", "Required", "—", "{ data: UserPreferences }"],
      [
        "PATCH",
        "/api/settings",
        "Required",
        "Partial<UserPreferences>",
        "{ data: UserPreferences }",
      ],
      [
        "POST",
        "/api/settings/delete-account",
        "Required",
        "{ confirmation }",
        "{ success } (queues GDPR deletion)",
      ],
    ],
    [700, 2200, 800, 2200, 3460],
    C.indigo,
  ),
  ...sp(1),
  PB(),
];

// ═══════════════ S4 — EDGE FUNCTIONS ═════════════════════════════
const s4 = [
  secHeader("⚡", "SECTION 4 — SUPABASE EDGE FUNCTIONS"),
  hr(),
  T(
    ["Function", "Trigger", "Runtime", "Key Operations", "Est. Cost/Call"],
    [
      [
        "process-journal",
        "Realtime on journal_entries INSERT (is_draft=FALSE)",
        "Deno (Supabase)",
        "1. Generate embedding (text-embedding-3-small)\n2. EI analysis (gpt-4o-mini)\n3. Save emotion_analysis\n4. Generate ai_insights\n5. Extract memories (every 3rd entry)",
        "~$0.003",
      ],
      [
        "ai-coach",
        "POST /functions/v1/ai-coach",
        "Deno (Supabase)",
        "1. Rate limit check (check_feature)\n2. Assemble 5-source context\n3. Stream GPT-4o response (SSE)\n4. Save coach_messages\n5. Update session token count",
        "~$0.02/msg",
      ],
      [
        "midtrans-webhook",
        "POST from Midtrans gateway",
        "Deno (Supabase)",
        "1. Verify signature (SHA512)\n2. Update payment_transactions\n3. Activate subscription on success\n4. Trigger invoice generation",
        "Free (no AI)",
      ],
      [
        "send-notifications",
        "pg_cron 13:00 UTC daily",
        "Deno (Supabase)",
        "1. queue_streak_reminders()\n2. Fetch unsent push notifs\n3. Send via FCM/APNs\n4. Update sent_at / failed_at",
        "Free (no AI)",
      ],
      [
        "generate-memory-books",
        "pg_cron 03:00 UTC 1st of month",
        "Deno (Supabase)",
        "1. generate_all_memory_books() SQL\n2. Call GPT-4o for narrative text\n3. Update memory_books.ai_narrative\n4. Set is_ready = TRUE",
        "~$0.05/book",
      ],
      [
        "refresh-analytics",
        "pg_cron 02:00 UTC daily",
        "PostgreSQL SQL",
        "refresh_analytics_views() — refresh 3 materialized views concurrently",
        "Free (SQL only)",
      ],
    ],
    [1400, 2000, 1000, 2800, 1360 + 800],
    C.teal,
  ),
  ...sp(1),
  H("4.1  process-journal Pipeline Detail", HeadingLevel.HEADING_2),
  callout(
    "This is the most critical Edge Function. It runs async after every finalized journal save and powers the Emotional Intelligence Engine, AI Insights, and Long-term Memory.",
  ),
  T(
    [
      "Step",
      "Action",
      "Model",
      "Input Tokens (est.)",
      "Output Tokens (est.)",
      "Condition",
    ],
    [
      ["1", "Content assembly", "—", "—", "—", "Always"],
      ["2", "Content hash check", "—", "—", "—", "Skip if unchanged"],
      [
        "3",
        "Embedding generation",
        "text-embedding-3-small",
        "~600 tokens",
        "1536-dim vector",
        "Always if content changed",
      ],
      [
        "4",
        "EI analysis (7 scores + insight)",
        "gpt-4o-mini",
        "~800 tokens",
        "~300 tokens",
        "Always",
      ],
      ["5", "Save emotion_analysis", "SQL UPSERT", "—", "—", "Always"],
      [
        "6",
        "Upsert ai_insights (daily)",
        "SQL",
        "—",
        "—",
        "If insight_text exists",
      ],
      [
        "7",
        "Memory extraction",
        "gpt-4o-mini",
        "~400 tokens",
        "~150 tokens",
        "Every 3rd journal only",
      ],
      [
        "8",
        "Memory embedding",
        "text-embedding-3-small",
        "~50 tokens each",
        "1536-dim each",
        "Up to 3 memories",
      ],
      [
        "Total cost (per journal)",
        "—",
        "—",
        "~1850 tokens",
        "~450 tokens",
        "~$0.003 at gpt-4o-mini pricing",
      ],
    ],
    [400, 2000, 1400, 1600, 1600, 2360],
    C.violet,
  ),
  ...sp(1),
  PB(),
];

// ═══════════════ S5 — TYPESCRIPT TYPES ═══════════════════════════
const s5 = [
  secHeader("📝", "SECTION 5 — TYPESCRIPT TYPE SYSTEM"),
  hr(),
  H("5.1  Type Architecture", HeadingLevel.HEADING_2),
  callout(
    "Types are generated from the PostgreSQL schema via: supabase gen types typescript --local > src/types/database.ts. Never write Database types manually — always regenerate after migrations.",
  ),
  ...sp(1),
  T(
    ["Type Category", "Source", "Key Types", "Usage"],
    [
      [
        "Row Types (DB exact)",
        "Generated from schema",
        "Profile, JournalEntry, Streak, CoachSession, Garden, Habit, MemoryBook, Subscription, AIInsight...",
        "Direct Supabase query results",
      ],
      [
        "Insert Types",
        "Generated (omits server-set cols)",
        "JournalInsert, HabitInsert, MoodLogInsert, EmotionInsert, GratitudeInsert, BreathingInsert",
        "API POST body validation",
      ],
      [
        "Update Types",
        "Generated (Partial of Insert)",
        "JournalUpdate, HabitUpdate",
        "API PATCH body",
      ],
      [
        "Enum Types",
        "From PostgreSQL ENUMs",
        "UserPlan, MoodCategory, GardenLevel, SubscriptionStatus, AiModel, InsightPeriod, DevicePlatform...",
        "All status/category fields",
      ],
      [
        "Composite Types (API)",
        "app.ts (manual)",
        "JournalEntryFull, DashboardData, MoodCalendarDay, LifeWheelScores, SearchResult",
        "API response shapes",
      ],
      [
        "Zod Schemas",
        "validation.ts",
        "journalInsertSchema, habitInsertSchema, lifeWheelSchema",
        "Runtime validation in API routes",
      ],
    ],
    [1600, 1600, 2500, 3660],
    C.indigo,
  ),
  ...sp(1),
  H("5.2  Key Composite Types", HeadingLevel.HEADING_2),
  ...code([
    "// JournalEntryFull — used by GET /api/journals/[id]",
    "type JournalEntryFull = JournalEntry & {",
    "  emotions: JournalEmotion[]",
    "  gratitude_items: GratitudeItem[]",
    "  emotion_analysis: EmotionAnalysis | null",
    '  coach_sessions: Pick<CoachSession, "id"|"started_at"|"total_messages">[]',
    "}",
    "",
    "// DashboardData — from get_dashboard_data() RPC",
    "type DashboardData = {",
    '  streak: Pick<Streak, "current_streak"|"longest_streak"|"total_entries">',
    "  mood_today: { score: number; category: MoodCategory } | null",
    '  xp: Pick<UserXP, "total_xp"|"current_level">',
    "  garden_level: GardenLevel",
    "  weekly_avg_mood: number | null",
    "  unread_insights: number",
    "  pending_achievements: number",
    "}",
    "",
    "// LifeWheelScores — JSON type for life_wheel_entries.scores",
    "type LifeWheelScores = {",
    "  career: number; health: number; family: number; finance: number",
    "  spiritual: number; relationships: number; learning: number; happiness: number",
    "}",
  ]),
  ...sp(1),
  PB(),
];

// ═══════════════ S6 — SECURITY ═══════════════════════════════════
const s6 = [
  secHeader("🔐", "SECTION 6 — SECURITY MODEL"),
  hr(),
  H("6.1  Defense Layers", HeadingLevel.HEADING_2),
  T(
    ["Layer", "Mechanism", "What It Protects"],
    [
      [
        "Network",
        "HTTPS everywhere, Supabase API keys in server-side only env vars",
        "Man-in-the-middle, key exposure",
      ],
      [
        "Auth",
        "Supabase JWT (httpOnly cookies on web, secure storage on mobile)",
        "Session hijacking, CSRF",
      ],
      [
        "API Layer",
        "auth.uid() check in all server routes, Zod schema validation",
        "Unauthorized access, injection",
      ],
      [
        "Database RLS",
        "65+ policies: user_id = auth.uid() on every table",
        "Cross-user data leakage",
      ],
      [
        "FORCE RLS",
        "6 critical tables force RLS even for table owner",
        "Accidental bypass",
      ],
      [
        "Triggers",
        "SECURITY DEFINER for streak/garden/XP — no direct client writes",
        "Cheating, data manipulation",
      ],
      [
        "Edge Functions",
        "Service role key only in Edge Functions (never in client)",
        "Privilege escalation",
      ],
      [
        "Audit",
        "Immutable audit_logs on subscriptions, payments, profile changes",
        "Forensics, compliance",
      ],
      [
        "GDPR",
        "data_requests table, 30-day soft delete, hard_delete_expired_accounts()",
        "Right to erasure",
      ],
      [
        "PII Protection",
        "device_id hashed (SHA256), ip_hash stored not raw, no PII to AI API",
        "Privacy compliance",
      ],
    ],
    [1200, 3200, 5160 - 600],
    C.red,
  ),
  ...sp(1),
  H("6.2  Environment Variables Required", HeadingLevel.HEADING_2),
  T(
    ["Variable", "Location", "Required", "Purpose"],
    [
      [
        "NEXT_PUBLIC_SUPABASE_URL",
        ".env.local + Vercel",
        "YES",
        "Supabase project URL (safe to expose)",
      ],
      [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        ".env.local + Vercel",
        "YES",
        "Supabase anon key (safe to expose, RLS enforces)",
      ],
      [
        "SUPABASE_SERVICE_ROLE_KEY",
        "Vercel server-side only",
        "YES",
        "Bypass RLS for Edge Functions — NEVER expose to client",
      ],
      [
        "OPENAI_API_KEY",
        "Supabase secrets + Vercel",
        "YES",
        "GPT-4o and embeddings",
      ],
      [
        "MIDTRANS_SERVER_KEY",
        "Vercel server-side only",
        "YES",
        "Payment verification",
      ],
      [
        "MIDTRANS_CLIENT_KEY",
        ".env.local + Vercel",
        "YES",
        "Client-side Midtrans Snap (safe to expose)",
      ],
      [
        "FCM_SERVER_KEY",
        "Supabase secrets",
        "Mobile only",
        "Firebase Cloud Messaging",
      ],
      ["RESEND_API_KEY", "Vercel server-side", "YES", "Transactional emails"],
      [
        "NEXT_PUBLIC_APP_URL",
        ".env.local + Vercel",
        "YES",
        "Base URL for callbacks and links",
      ],
    ],
    [2400, 1800, 1000, 4160],
    C.slate,
  ),
  ...sp(1),
  PB(),
];

// ═══════════════ S7 — DEPLOYMENT ═════════════════════════════════
const s7 = [
  secHeader("🚀", "SECTION 7 — DEPLOYMENT & OPERATIONS"),
  hr(),
  H("7.1  Production Deployment Checklist", HeadingLevel.HEADING_2),
  ...sp(1),
  P("Phase 1 — Supabase Setup", { bold: true, color: C.indigo }),
  N("Create Supabase project (Singapore region for Indonesia users)."),
  N(
    "Enable extensions: uuid-ossp, pgcrypto, vector, pg_trgm, unaccent in SQL Editor.",
  ),
  N("Run migrations 000 → 012 in order via SQL Editor or supabase db push."),
  N("Configure Google OAuth: Auth > Providers > Google. Add callback URL."),
  N('Create storage bucket "memory-books" with private access + RLS.'),
  N(
    "Run: SELECT public.refresh_analytics_views(); to seed materialized views.",
  ),
  N(
    "Enable pg_cron (requires Supabase Pro). Run schedule commands from file 011.",
  ),
  ...sp(1),
  P("Phase 2 — Edge Functions Deploy", { bold: true, color: C.teal }),
  N("supabase functions deploy process-journal"),
  N("supabase functions deploy ai-coach"),
  N("supabase functions deploy midtrans-webhook"),
  N("supabase functions deploy send-notifications"),
  N("supabase functions deploy generate-memory-books"),
  N(
    "Set secrets: supabase secrets set OPENAI_API_KEY=sk-... FCM_SERVER_KEY=...",
  ),
  ...sp(1),
  P("Phase 3 — Vercel Web Deploy", { bold: true, color: C.violet }),
  N("Connect GitHub repo to Vercel. Set framework: Next.js."),
  N("Add all environment variables in Vercel dashboard."),
  N("Set NEXTAUTH_SECRET for cookie signing."),
  N(
    "Configure Midtrans webhook URL: https://your-domain.com/api/payments/webhook.",
  ),
  N("Run: vercel --prod for first production deployment."),
  ...sp(1),
  P("Phase 4 — Mobile (EAS)", { bold: true, color: C.green }),
  N("Install EAS CLI: npm install -g eas-cli"),
  N("Configure eas.json with production profile."),
  N("Set up Apple Developer + Google Play Console accounts."),
  N("eas build --platform all --profile production"),
  N("Submit to stores: eas submit --platform all"),
  ...sp(1),
  H("7.2  Monitoring & Alerting", HeadingLevel.HEADING_2),
  T(
    ["What to Monitor", "Tool", "Alert Threshold", "Action"],
    [
      ["API Error Rate", "Sentry", "> 1% 5xx errors", "Page on-call engineer"],
      [
        "AI Cost per Day",
        "OpenAI Dashboard",
        "> $50/day",
        "Email engineering lead",
      ],
      [
        "DB Connections",
        "Supabase Dashboard",
        "> 80% pool used",
        "Scale up compute tier",
      ],
      [
        "Slow Queries",
        "pg_stat_statements",
        "> 500ms avg",
        "Add index or optimize",
      ],
      [
        "Streak Reminder Failures",
        "Edge Fn logs",
        "> 5% delivery fail",
        "Check FCM token validity",
      ],
      [
        "Payment Webhook Errors",
        "Sentry",
        "Any 5xx from Midtrans",
        "Immediate investigation",
      ],
      [
        "Free User Conversion",
        "Vercel Analytics",
        "< 3% conversion",
        "Review paywall UX",
      ],
      [
        "Day-7 Retention",
        "Custom dashboard",
        "< 35%",
        "Review onboarding flow",
      ],
    ],
    [2000, 1600, 1800, 4060],
    C.amber,
  ),
  ...sp(1),
  PB(),
];

// ═══════════════ S8 — SPRINT MAP ═════════════════════════════════
const s8 = [
  secHeader("🏃", "SECTION 8 — TECHNICAL SPRINT EXECUTION MAP"),
  hr(),
  T(
    ["Sprint", "Weeks", "DB Tables Used", "API Routes Built", "Edge Functions"],
    [
      [
        "S1 — Foundation",
        "1-2",
        "profiles, user_preferences, user_devices",
        "/api/auth/*, /api/settings",
        "—",
      ],
      [
        "S2 — Core Journal",
        "3-4",
        "journal_entries, journal_emotions, gratitude_items, journal_affirmations, mood_logs",
        "/api/journals (GET, POST), /api/journals/[id]",
        "—",
      ],
      [
        "S3 — Streak + Cal.",
        "5-6",
        "streaks, streak_history, user_achievements, achievement_definitions",
        "/api/mood/calendar, /api/dashboard",
        "—",
      ],
      [
        "S4 — Garden + Sound",
        "7-8",
        "gardens, garden_plants, soundscape_sessions",
        "No new routes (triggered by journal save)",
        "—",
      ],
      [
        "S5 — Habits + Life",
        "9-10",
        "habits, habit_logs, life_wheel_entries, breathing_sessions",
        "/api/habits, /api/life-wheel",
        "—",
      ],
      [
        "S6 — AI Coach V1",
        "11-12",
        "coach_sessions, coach_messages, reflection_prompts",
        "/api/ai/coach, /api/ai/coach/session",
        "ai-coach V1",
      ],
      [
        "S7 — EI Engine",
        "13-14",
        "emotion_analysis, ai_user_memory, ai_insights",
        "/api/ai/insights",
        "process-journal",
      ],
      [
        "S8 — Coach V2",
        "15-16",
        "coach_messages (embedding), ai_user_memory (context injection)",
        "/api/search (semantic)",
        "ai-coach V2 + streaming",
      ],
      [
        "S9 — Memory Vault",
        "17-18",
        "memory_books, annual_reviews",
        "/api/memory/books",
        "generate-memory-books",
      ],
      [
        "S10 — Analytics",
        "19-20",
        "mv_daily/weekly/monthly_user_stats, habit_correlations",
        "/api/analytics/*",
        "refresh-analytics (pg_cron)",
      ],
      [
        "S11 — Mobile Base",
        "21-22",
        "user_devices (push tokens), sync_queue",
        "All existing routes tested on mobile",
        "send-notifications",
      ],
      [
        "S12 — Mobile Full",
        "23-24",
        "notification_queue, notification_schedules",
        "Mobile-specific endpoints",
        "—",
      ],
      [
        "S13 — Payment V1",
        "25-26",
        "subscriptions, payment_transactions, invoices, plan_definitions",
        "/api/payments/create, /api/payments/webhook",
        "midtrans-webhook",
      ],
      [
        "S14 — Launch Prep",
        "27-28",
        "coupons, coupon_redemptions, feature_flags, referral_codes, audit_logs, data_requests",
        "/api/settings/delete-account, /api/payments/webhook full",
        "All Edge Fns hardened",
      ],
    ],
    [800, 700, 2500, 2200, 3260 - 200],
    C.indigo,
  ),
  ...sp(2),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 40 },
    children: [
      new TextRun({
        text: "🌱  MindBloom — Build with Purpose, Ship with Confidence  🌱",
        font: "Arial",
        size: 28,
        bold: true,
        color: C.indigo,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "Full Stack Technical Documentation v2.0  ·  Confidential  ·  May 2025",
        font: "Arial",
        size: 20,
        italic: true,
        color: C.slate,
      }),
    ],
  }),
];

// ═══════════════ ASSEMBLE DOCUMENT ═══════════════════════════════
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 480, hanging: 240 } } },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 480, hanging: 240 } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: C.slate } } },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 44, bold: true, font: "Arial", color: C.dark },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: C.indigo },
        paragraph: { spacing: { before: 300, after: 100 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.violet },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: C.indigo,
                  space: 1,
                },
              },
              spacing: { before: 0, after: 120 },
              children: [
                new TextRun({
                  text: "🌱  MindBloom — Full Stack Technical Documentation  v2.0",
                  font: "Arial",
                  size: 18,
                  color: C.indigo,
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: {
                top: {
                  style: BorderStyle.SINGLE,
                  size: 4,
                  color: C.indigo,
                  space: 1,
                },
              },
              spacing: { before: 120, after: 0 },
              tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
              children: [
                new TextRun({
                  text: "Confidential · May 2025   \t",
                  font: "Arial",
                  size: 16,
                  color: C.slate,
                }),
                new TextRun({
                  children: [new SimpleField("PAGE")],
                  font: "Arial",
                  size: 16,
                  color: C.indigo,
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...cover,
        ...s1,
        ...s2,
        ...s3,
        ...s4,
        ...s5,
        ...s6,
        ...s7,
        ...s8,
      ],
    },
  ],
});

Packer.toBuffer(doc)
  .then((buf) => {
    fs.writeFileSync(
      "/mnt/user-data/outputs/MindBloom_FullStack_Technical_Doc.docx",
      buf,
    );
    console.log("✅ Done: MindBloom_FullStack_Technical_Doc.docx");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
