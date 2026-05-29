const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, LevelFormat, TabStopType, PageBreak, SimpleField
} = require('docx');
const fs = require('fs');

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 9360; // content width DXA (US Letter, 1" margins each side)
const C = {
  indigo:  "5B4FE8", violet: "7C6EF5",  pink:   "FF7B8A",
  green:   "1DB97A", amber:  "F0A500",  red:    "E85B5B",
  teal:    "0D9488", blue:   "2563EB",  slate:  "475569",
  dark:    "0F172A", white:  "FFFFFF",  nearW:  "FAFAFA",
  lightI:  "EEF0FE", lightG: "ECFDF5",  lightA: "FFFBEB",
  lightR:  "FEF2F2", lightT: "F0FDFA",  gray:   "F8FAFC",
};
const brd = (c="DDDDDD") => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = (c="DDDDDD") => ({ top: brd(c), bottom: brd(c), left: brd(c), right: brd(c) });
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sp = (n=1) => Array.from({length:n}, ()=> new Paragraph({ children:[new TextRun("")], spacing:{before:0,after:0} }));

function hr(color=C.indigo) {
  return new Paragraph({
    spacing:{before:160,after:160},
    border:{ bottom:{ style:BorderStyle.SINGLE, size:4, color, space:1 } },
    children:[new TextRun("")]
  });
}

function H(text, level=HeadingLevel.HEADING_1, color=C.dark) {
  const sizes = { [HeadingLevel.HEADING_1]:40, [HeadingLevel.HEADING_2]:30, [HeadingLevel.HEADING_3]:24, [HeadingLevel.HEADING_4]:22 };
  const spaces = { [HeadingLevel.HEADING_1]:400, [HeadingLevel.HEADING_2]:280, [HeadingLevel.HEADING_3]:200, [HeadingLevel.HEADING_4]:160 };
  return new Paragraph({
    heading: level,
    spacing:{ before: spaces[level]||160, after: 100 },
    children:[new TextRun({ text, bold:true, color, font:"Arial", size: sizes[level]||22 })]
  });
}

function P(text, opts={}) {
  return new Paragraph({
    spacing:{ before: opts.before||60, after: opts.after||60 },
    alignment: opts.align || AlignmentType.LEFT,
    indent: opts.indent ? { left: opts.indent } : undefined,
    children:[new TextRun({ text, font:"Arial", size: opts.size||22,
      bold: opts.bold||false, italic: opts.italic||false,
      color: opts.color||C.slate })]
  });
}

function B(text, level=0) {
  return new Paragraph({
    numbering:{ reference:"bullets", level },
    spacing:{before:30, after:30},
    children:[new TextRun({ text, font:"Arial", size:21, color:C.slate })]
  });
}

function N(text, level=0) {
  return new Paragraph({
    numbering:{ reference:"numbers", level },
    spacing:{before:30, after:30},
    children:[new TextRun({ text, font:"Arial", size:21, color:C.slate })]
  });
}

function code(text) {
  return new Paragraph({
    spacing:{before:40,after:40},
    indent:{ left:360 },
    children:[new TextRun({ text, font:"Courier New", size:18, color:"1E293B" })]
  });
}

function sectionTitle(emoji, title, color=C.indigo) {
  return new Paragraph({
    spacing:{before:560, after:160},
    children:[new TextRun({ text:`${emoji}  ${title}`, font:"Arial", size:48, bold:true, color })]
  });
}

function callout(text, fill=C.lightI, borderColor=C.indigo) {
  return new Paragraph({
    spacing:{before:120, after:120},
    border:{ left:{ style:BorderStyle.SINGLE, size:12, color:borderColor, space:1 } },
    indent:{ left:360, right:360 },
    shading:{ type:ShadingType.CLEAR, fill },
    children:[new TextRun({ text, font:"Arial", size:21, color:C.dark, italic:true })]
  });
}

function tRow(cells, opts={}) {
  return new TableRow({
    children: cells.map((c,i) => new TableCell({
      borders: borders(opts.borderColor||"E2E8F0"),
      shading:{ type:ShadingType.CLEAR, fill: opts.fill || (opts.stripe && i%2===0 ? C.white : C.nearW) || C.white },
      margins:{ top:80, bottom:80, left:120, right:120 },
      width: opts.widths ? { size: opts.widths[i], type: WidthType.DXA } : undefined,
      verticalAlign: VerticalAlign.TOP,
      children:[new Paragraph({
        children:[new TextRun({ text: String(c.text||c), font:"Arial", size:20,
          bold: c.bold||opts.headerRow||false,
          color: c.color||(opts.headerRow ? C.white : C.dark),
          italic: c.italic||false })]
      })]
    }))
  });
}

function T(headers, rows, widths, headerFill=C.indigo) {
  return new Table({
    width:{ size: widths.reduce((a,b)=>a+b,0), type:WidthType.DXA },
    columnWidths: widths,
    rows:[
      tRow(headers, { headerRow:true, fill: headerFill, borderColor:"AAAAAA", widths }),
      ...rows.map((r,ri) => tRow(r, { fill: ri%2===0 ? C.white : C.gray, borderColor:"E2E8F0", widths }))
    ]
  });
}

function statusBadge(text, color) {
  return { text: ` ${text} `, color: C.white, bold:true };
}

// ─── Page break ───────────────────────────────────────────────────────────────
const PB = () => new Paragraph({ children:[new PageBreak()] });

// ═══════════════════════════════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════════════════════════════
const cover = [
  ...sp(5),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:80},
    children:[new TextRun({ text:"🌱", font:"Arial", size:120 })] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:120},
    children:[new TextRun({ text:"MindBloom", font:"Arial", size:96, bold:true, color:C.indigo })] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:80},
    children:[new TextRun({ text:"Database Design & Technical Documentation", font:"Arial", size:36, color:C.violet })] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:60},
    children:[new TextRun({ text:"Production-Ready PostgreSQL + Supabase Schema", font:"Arial", size:26, italic:true, color:C.slate })] }),
  ...sp(1),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:40},
    children:[new TextRun({ text:"v1.0  ·  May 2025  ·  Confidential", font:"Arial", size:22, color:C.slate })] }),
  ...sp(2),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:20},
    children:[
      new TextRun({ text:"  55 Tables  ", font:"Arial", size:20, bold:true, color:C.white, shading:{ type:ShadingType.CLEAR, fill:C.indigo } }),
      new TextRun({ text:"   " }),
      new TextRun({ text:"  3 Mat. Views  ", font:"Arial", size:20, bold:true, color:C.white, shading:{ type:ShadingType.CLEAR, fill:C.violet } }),
      new TextRun({ text:"   " }),
      new TextRun({ text:"  25+ Functions  ", font:"Arial", size:20, bold:true, color:C.white, shading:{ type:ShadingType.CLEAR, fill:C.teal } }),
    ]
  }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:20,after:0},
    children:[
      new TextRun({ text:"  65+ RLS Policies  ", font:"Arial", size:20, bold:true, color:C.white, shading:{ type:ShadingType.CLEAR, fill:C.green } }),
      new TextRun({ text:"   " }),
      new TextRun({ text:"  80+ Indexes  ", font:"Arial", size:20, bold:true, color:C.white, shading:{ type:ShadingType.CLEAR, fill:C.amber } }),
      new TextRun({ text:"   " }),
      new TextRun({ text:"  13 Migration Files  ", font:"Arial", size:20, bold:true, color:C.white, shading:{ type:ShadingType.CLEAR, fill:C.slate } }),
    ]
  }),
  ...sp(3), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — DATABASE ARCHITECTURE OVERVIEW
// ═══════════════════════════════════════════════════════════════
const sec1 = [
  sectionTitle("🏗️","SECTION 1 — ARCHITECTURE OVERVIEW"),
  hr(),
  H("1.1  Design Principles", HeadingLevel.HEADING_2, C.indigo),
  B("Security First: RLS enabled on every table, FORCE ROW LEVEL SECURITY on sensitive tables."),
  B("Scalability: Partitioned tables for high-volume data (activity_events, audit_logs)."),
  B("AI-Ready: pgvector extension, VECTOR(1536) columns, IVFFlat indexes for semantic search."),
  B("Offline Sync: sync_queue table for optimistic mobile updates with conflict resolution."),
  B("Audit Trail: Immutable audit_logs + security_events for compliance (GDPR/PDPA)."),
  B("Performance: Materialized views refreshed nightly, partial indexes on hot paths."),
  B("Soft Deletes: is_deleted + deleted_at on all user-owned tables. Hard delete via GDPR request."),
  B("Automation: Triggers handle streak calculation, garden growth, XP awarding, profile sync."),
  ...sp(1),
  H("1.2  Cluster Architecture", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Cluster","Tables","Key Relationships","Primary Use"],
    [
      ["👤 Core / Users",     "5",  "profiles ← auth.users (1:1), user_preferences (1:1)",           "Identity, device, preferences, offline sync"],
      ["📖 Journal Core",     "7",  "journal_entries → emotions, gratitude, embeddings (1:N)",        "15-step journaling, full-text + semantic search"],
      ["🎮 Gamification",     "6",  "streaks (1:1), achievements (1:N) → definitions (catalog)",      "Streak, XP, levels, badges"],
      ["🤖 AI System",        "5",  "coach_sessions → messages (1:N), emotion_analysis (1:1 entry)",  "AI Coach, EI Engine, insights, memory"],
      ["🌿 Premium Features", "8",  "gardens (1:1), habits (1:N), life_wheel (1:N)",                  "Garden, habits, life wheel, breathing"],
      ["📖 Memory Vault",     "2",  "memory_books (1:N per user), annual_reviews (1:N)",              "Monthly books, annual review"],
      ["💰 Billing",          "6",  "subscriptions (1:active per user), payments (1:N)",              "Plans, payments, invoices, coupons"],
      ["🔔 Notifications",    "3",  "notification_queue (1:N), schedules (1:N per type)",             "Push, email, in-app notifications"],
      ["📊 Observability",    "5",  "activity_events (partitioned), audit_logs (partitioned)",        "Analytics, audit, security, GDPR"],
      ["⚙️ Config & Flags",   "6",  "feature_flags → user_feature_flags (override), app_config",     "Feature gates, A/B tests, referrals"],
      ["📋 Catalogs",         "4",  "achievement_definitions, plan_definitions, templates, prompts",  "Static reference data (read-only)"],
    ],
    [1000,500,3300,3660],
    C.indigo
  ),
  ...sp(1),
  H("1.3  Migration File Index", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["File","Purpose","Key Objects"],
    [
      ["000_extensions.sql",         "PostgreSQL extensions & custom ENUM types",    "uuid-ossp, pgcrypto, vector, pg_trgm + 14 ENUMs"],
      ["001_core_users.sql",         "User profiles, devices, preferences, sync",    "profiles, user_preferences, user_devices, sync_queue"],
      ["002_journal_core.sql",       "Journal entries + all sub-tables",             "journal_entries, journal_emotions, gratitude_items, mood_logs, journal_embeddings"],
      ["003_streaks_achievements.sql","Streak engine + gamification",                "streaks, streak_history, user_achievements, user_xp, xp_transactions"],
      ["004_ai_system.sql",          "AI Coach, EI Engine, memory, insights",        "coach_sessions, coach_messages, ai_user_memory, emotion_analysis, ai_insights"],
      ["005_features_premium.sql",   "Garden, Habits, Life Wheel, Breathing",        "gardens, garden_plants, habits, habit_logs, life_wheel_entries, breathing_sessions"],
      ["006_memory_vault.sql",       "Monthly books & annual reviews",               "memory_books, annual_reviews"],
      ["007_subscriptions_billing.sql","Plans, subs, payments, invoices",            "plan_definitions, subscriptions, payment_transactions, invoices, coupons"],
      ["008_notifications_audit.sql","Notifications, audit log, activity tracking",  "notification_queue, activity_events (partitioned), audit_logs (partitioned)"],
      ["009_rls_policies.sql",       "All 65+ Row Level Security policies",          "RLS ENABLE + CREATE POLICY for every table"],
      ["010_analytics_views.sql",    "Materialized views & analytics functions",     "mv_daily_user_stats, mv_weekly_user_stats, mv_monthly_user_stats + 6 functions"],
      ["011_feature_flags_referral.sql","Feature flags, A/B, referrals, config",    "feature_flags, referral_codes, app_config, journal_templates"],
      ["012_background_jobs.sql",    "pg_cron functions & trigger automations",      "generate_memory_book, queue_streak_reminders, compute_habit_correlation"],
    ],
    [2200,2500,4760],
    C.slate
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — ERD ENTITY RELATIONSHIP DIAGRAM
// ═══════════════════════════════════════════════════════════════
const sec2 = [
  sectionTitle("📐","SECTION 2 — ERD & TABLE RELATIONSHIPS"),
  hr(),
  H("2.1  Core User Relationships", HeadingLevel.HEADING_2, C.indigo),
  callout("auth.users (Supabase Auth) is the root. A trigger auto-creates profiles + user_preferences on every new signup. All tables reference profiles(id) with ON DELETE CASCADE."),
  T(
    ["Table","Type","References","Cardinality","Notes"],
    [
      ["profiles",            "Core",   "auth.users(id)",      "1:1",  "Auto-created by trigger. Source of plan field."],
      ["user_preferences",    "Core",   "profiles(id)",        "1:1",  "Auto-created by handle_new_user() trigger."],
      ["user_devices",        "Core",   "profiles(id)",        "1:N",  "Multi-device. Stores FCM/APNs push tokens."],
      ["onboarding_answers",  "Core",   "profiles(id)",        "1:1",  "Filled once during onboarding flow."],
      ["sync_queue",          "Core",   "profiles(id)",        "1:N",  "Mobile offline sync. Resolved = processed."],
    ],
    [1600,700,1600,800,4660],
    C.teal
  ),
  ...sp(1),
  H("2.2  Journal Cluster Relationships", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Table","References","Cardinality","Notes"],
    [
      ["journal_entries",      "profiles(id)",            "1:N per user",   "Core. UNIQUE(user_id, entry_date) for finalized entries."],
      ["journal_emotions",     "journal_entries(id) + profiles(id)", "1:N", "Step 3 multi-select. Multiple emotions per entry."],
      ["gratitude_items",      "journal_entries(id) + profiles(id)", "1:N", "Step 9. Min 3. user_id denormalized for fast RLS."],
      ["journal_affirmations", "journal_entries(id) + profiles(id)", "1:N", "Step 14. Preset or custom."],
      ["mood_logs",            "profiles(id), journal_entries(id)?", "1:N","Quick mood log from dashboard. entry_id optional."],
      ["journal_embeddings",   "journal_entries(id) + profiles(id)", "1:1","VECTOR(1536). One per entry. IVFFlat index."],
      ["emotion_analysis",     "journal_entries(id) + profiles(id)", "1:1","AI-generated. Async after save. 7 score dimensions."],
    ],
    [1800,2200,1200,4160],
    C.violet
  ),
  ...sp(1),
  H("2.3  AI System Relationships", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Table","References","Cardinality","Notes"],
    [
      ["coach_sessions",  "profiles + journal_entries?", "1:N per user",   "One session per coach conversation. entry_id optional."],
      ["coach_messages",  "coach_sessions + profiles",   "1:N per session","Normalized (not JSONB). Searchable. Has embedding."],
      ["ai_user_memory",  "profiles",                    "1:N per user",   "Long-term facts. Confidence score. Embedding for retrieval."],
      ["ai_insights",     "profiles",                    "1:N per user",   "UNIQUE(user_id, period, period_start, category)."],
    ],
    [1600,2000,1400,4360],
    C.pink
  ),
  ...sp(1),
  H("2.4  Billing Relationships", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Table","References","Cardinality","Trigger / Automation"],
    [
      ["plan_definitions",       "—",              "Catalog",    "Static seed data. Not user-specific."],
      ["subscriptions",          "profiles",       "1:active",   "UNIQUE partial index on (user_id) WHERE active/trialing. Trigger syncs plan → profiles.plan."],
      ["payment_transactions",   "profiles + subscriptions?", "1:N", "Populated by Midtrans webhook. midtrans_order_id UNIQUE."],
      ["invoices",               "profiles + subscriptions + transactions", "1:N", "Created after payment_status = success."],
      ["coupons",                "—",              "Catalog",    "Global discount codes."],
      ["coupon_redemptions",     "coupons + profiles + transactions", "1 per user per coupon", "UNIQUE(coupon_id, user_id)."],
    ],
    [1600,2000,1200,4560],
    C.amber
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — TABLE SCHEMAS (key tables detail)
// ═══════════════════════════════════════════════════════════════
const sec3 = [
  sectionTitle("📋","SECTION 3 — KEY TABLE SCHEMAS"),
  hr(),
  H("3.1  profiles", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Column","Type","Nullable","Default","Description"],
    [
      ["id",             "UUID",        "NO",  "—",          "PK. References auth.users(id) ON DELETE CASCADE"],
      ["email",          "TEXT",        "NO",  "—",          "Synced from auth.users on signup"],
      ["full_name",      "TEXT",        "YES", "—",          "From Google OAuth or manual entry"],
      ["display_name",   "TEXT",        "YES", "—",          "Shown in greeting: 'Selamat pagi, {display_name}'"],
      ["timezone",       "TEXT",        "NO",  "Asia/Makassar", "For correct date calculations"],
      ["plan",           "user_plan",   "NO",  "'free'",     "Denormalized from subscriptions for fast reads"],
      ["onboarded_at",   "TIMESTAMPTZ", "YES", "NULL",       "NULL = onboarding not completed"],
      ["last_active_at", "TIMESTAMPTZ", "YES", "—",          "Updated by activity middleware"],
      ["is_deleted",     "BOOLEAN",     "NO",  "FALSE",      "Soft delete flag. Hard delete after 30 days."],
    ],
    [1400,1200,900,1500,4460],
    C.indigo
  ),
  ...sp(1),
  H("3.2  journal_entries", HeadingLevel.HEADING_2, C.indigo),
  callout("Central table. One finalized entry per user per calendar day. Drafts are excluded from the uniqueness constraint. All 15 journaling steps map to columns here."),
  T(
    ["Column","Type","Step","Description"],
    [
      ["id",                 "UUID",        "—",      "Primary key"],
      ["user_id",            "UUID",        "—",      "FK → profiles. ON DELETE CASCADE"],
      ["entry_date",         "DATE",        "1",      "Calendar date (not timestamp). UNIQUE with user_id for final entries"],
      ["mood_score",         "SMALLINT",    "2",      "1–10 slider. Trigger derives mood_category"],
      ["mood_category",      "mood_category","2",     "Derived ENUM: happy/calm/excited/anxious/stressed/sad/tired"],
      ["energy_score",       "SMALLINT",    "4",      "0–100 battery visualization"],
      ["main_story",         "TEXT",        "5",      "Primary narrative. Indexed via main_story_tsv tsvector"],
      ["main_story_tsv",     "TSVECTOR",    "5",      "Auto-updated by trigger for Indonesian FTS"],
      ["recurring_thoughts", "TEXT",        "6",      "Overthinking content"],
      ["stress_source",      "TEXT",        "7",      "Source of stress"],
      ["stress_intensity",   "SMALLINT",    "7",      "1–10. Input to AI stress detection"],
      ["happy_moments",      "TEXT",        "8",      "Positive events of the day"],
      ["lessons_learned",    "TEXT",        "10",     "Insights & learning"],
      ["did_well",           "TEXT",        "11",     "Self-reflection: strengths"],
      ["improve_on",         "TEXT",        "11",     "Self-reflection: growth areas"],
      ["do_differently",     "TEXT",        "11",     "Self-reflection: tomorrow's plan"],
      ["self_compassion",    "TEXT",        "12",     "Self-compassion letter"],
      ["tomorrow_intention", "TEXT",        "13",     "Intention setting"],
      ["prayer_hope",        "TEXT",        "15",     "Free-form prayer or hope"],
      ["word_count",         "INTEGER",     "—",      "Auto-computed by trigger"],
      ["completion_pct",     "SMALLINT",    "—",      "0–100. Auto-computed. Used for garden rare flowers"],
      ["is_draft",           "BOOLEAN",     "—",      "TRUE = auto-saved draft. FALSE = final submission"],
    ],
    [1800,1300,700,5660],
    C.violet
  ),
  ...sp(1),
  H("3.3  emotion_analysis (AI EI Engine output)", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Column","Type","Range","Description"],
    [
      ["entry_id",           "UUID",           "—",      "FK → journal_entries (UNIQUE — 1:1)"],
      ["stress_score",       "NUMERIC(3,2)",   "0.0–1.0","AI-detected stress level"],
      ["anxiety_score",      "NUMERIC(3,2)",   "0.0–1.0","AI-detected anxiety"],
      ["gratitude_score",    "NUMERIC(3,2)",   "0.0–1.0","Gratitude depth in writing"],
      ["burnout_score",      "NUMERIC(3,2)",   "0.0–1.0","Emotional exhaustion signals"],
      ["optimism_score",     "NUMERIC(3,2)",   "0.0–1.0","Future-orientation and hope"],
      ["overthinking_score", "NUMERIC(3,2)",   "0.0–1.0","Rumination patterns detected"],
      ["self_compassion_score","NUMERIC(3,2)", "0.0–1.0","Self-kindness in writing"],
      ["dominant_emotion",   "TEXT",           "—",      "Single strongest emotion detected"],
      ["one_line_summary",   "TEXT",           "—",      "1-sentence AI summary of the day"],
      ["insight_text",       "TEXT",           "—",      "2–4 sentence personalized insight"],
      ["recommended_activity","TEXT",          "—",      "Suggested action (e.g., breathing if stress > 0.7)"],
      ["model_used",         "ai_model",       "—",      "gpt-4o-mini for cost efficiency"],
      ["tokens_used",        "INTEGER",        "—",      "For cost tracking per entry"],
    ],
    [1900,1400,900,5260],
    C.pink
  ),
  ...sp(1),
  H("3.4  ai_user_memory", HeadingLevel.HEADING_2, C.indigo),
  callout("Long-term AI memory extracted from journals and coach sessions. Used as context injection for personalized coaching. Embeddings enable semantic retrieval of relevant memories."),
  T(
    ["Column","Type","Description"],
    [
      ["memory_type",     "TEXT",         "fact | pattern | preference | achievement | trigger"],
      ["content",         "TEXT",         "Natural language fact. E.g., 'Sering stres Senin pagi karena rapat mingguan'"],
      ["source_type",     "TEXT",         "journal | coach | survey"],
      ["confidence",      "NUMERIC(3,2)", "0.0–1.0. Low confidence memories pruned over time"],
      ["embedding",       "VECTOR(1536)", "OpenAI text-embedding-3-small. For semantic retrieval."],
      ["is_active",       "BOOLEAN",      "Deactivated when superseded or outdated"],
      ["reference_count", "INTEGER",      "Incremented each time AI uses this memory in a response"],
    ],
    [1600,1600,6160],
    C.teal
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — RLS SECURITY MODEL
// ═══════════════════════════════════════════════════════════════
const sec4 = [
  sectionTitle("🔐","SECTION 4 — ROW LEVEL SECURITY MODEL"),
  hr(),
  H("4.1  Security Principles", HeadingLevel.HEADING_2, C.indigo),
  B("Every table has RLS ENABLED. No exceptions."),
  B("FORCE ROW LEVEL SECURITY on 6 most sensitive tables (profiles, journal_entries, subscriptions, payment_transactions, coach_sessions, ai_user_memory)."),
  B("auth.uid() is the sole identity anchor — never trust user-supplied user_id."),
  B("Service role (used by Edge Functions & pg_cron) bypasses RLS — never expose service key to clients."),
  B("Sensitive server operations (streak calc, garden growth, XP) run as SECURITY DEFINER functions."),
  B("Audit logs are write-only from client context — only service role can read."),
  ...sp(1),
  H("4.2  RLS Policy Summary", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Table / Cluster","SELECT","INSERT","UPDATE","DELETE","Notes"],
    [
      ["profiles",              "own only",  "trigger only", "own only",  "NONE (soft delete only)", "FORCE RLS"],
      ["journal_entries",       "own + not deleted", "own only", "own only", "NONE (soft delete)", "is_deleted filter in policy"],
      ["journal sub-tables",    "own only",  "own only",  "own only",  "CASCADE from entry",      "user_id denormalized for speed"],
      ["streaks",               "own only",  "trigger only","trigger only","trigger only",          "Only SECURITY DEFINER writes"],
      ["user_achievements",     "own only",  "server only", "NONE",      "NONE",                   "Earned server-side"],
      ["coach_sessions + msgs", "own only",  "own only",  "own only",  "CASCADE",                 "FORCE RLS on sessions"],
      ["ai_user_memory",        "own only",  "server only", "server only","server only",            "FORCE RLS. Clients read only"],
      ["emotion_analysis",      "own only",  "server only", "server only","server only",            "Written by Edge Function"],
      ["memory_books",          "own + share_token","server only","server only","server only",       "Share token = public read"],
      ["subscriptions",         "own only",  "server only", "server only","NONE",                   "FORCE RLS. Webhook writes."],
      ["payment_transactions",  "own only",  "server only", "server only","NONE",                   "FORCE RLS. Webhook writes."],
      ["audit_logs",            "NONE",      "trigger only","NONE",       "NONE",                   "Immutable. Service role reads."],
      ["activity_events",       "own only",  "own + anon",  "NONE",      "NONE",                   "Partitioned. Anon can insert."],
      ["feature_flags",         "all users", "service only","service only","service only",           "Public catalog"],
      ["plan_definitions",      "all users", "service only","service only","service only",           "Public catalog"],
    ],
    [2000,1000,900,900,900,3860],
    C.red
  ),
  ...sp(1),
  H("4.3  Security Pattern: Trigger vs Client Write", HeadingLevel.HEADING_2, C.indigo),
  callout("For data that users should NOT be able to directly manipulate (streaks, XP, garden plants, achievements), the database uses SECURITY DEFINER triggers. Client apps never INSERT/UPDATE these tables — they only trigger writes by saving journal entries. This prevents cheating and ensures data integrity."),
  T(
    ["Table","Who Writes","Mechanism","Why"],
    [
      ["streaks",         "DB Trigger (SECURITY DEFINER)", "AFTER INSERT on journal_entries",           "Prevents streak manipulation"],
      ["garden_plants",   "DB Trigger (SECURITY DEFINER)", "AFTER INSERT on journal_entries",           "Prevents fake garden growth"],
      ["user_xp",         "DB Function (SECURITY DEFINER)","Called by journal trigger",                 "Prevents XP farming"],
      ["emotion_analysis","Edge Function (service role)",  "Queued after journal save via Realtime",    "AI processing = server only"],
      ["ai_user_memory",  "Edge Function (service role)",  "Extracted from coach sessions",             "AI inference = server only"],
      ["subscriptions",   "Edge Function (service role)",  "Midtrans webhook → Edge Function",          "Payment = server only"],
      ["notifications",   "DB Function (service role)",    "pg_cron daily job",                         "Prevents notification spam"],
    ],
    [1600,2000,2500,3260],
    C.slate
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — INDEX STRATEGY
// ═══════════════════════════════════════════════════════════════
const sec5 = [
  sectionTitle("⚡","SECTION 5 — INDEX STRATEGY & QUERY OPTIMIZATION"),
  hr(),
  H("5.1  Index Categories", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Category","Type","Count","Purpose"],
    [
      ["Primary Keys",        "B-Tree (auto)",  "55",  "UUID PKs on all tables"],
      ["Foreign Keys",        "B-Tree",         "40+", "All FK columns indexed for JOIN performance"],
      ["Full-Text Search",    "GIN (tsvector)", "3",   "journal_entries.main_story_tsv + emotions + coach_messages"],
      ["Semantic Search",     "IVFFlat (vector)","3",  "journal_embeddings, coach_messages, ai_user_memory VECTOR columns"],
      ["Analytics Hot Path",  "B-Tree partial", "8",   "user+date+scores for dashboard & analytics queries"],
      ["Notification Delivery","B-Tree partial", "3",  "Unsent notifications due for delivery"],
      ["Billing",             "B-Tree partial", "4",   "Active subs, pending payments, expiring renewals"],
      ["Soft Delete Filters", "B-Tree partial", "5",   "WHERE is_deleted = FALSE (exclude dead rows)"],
      ["Partition Indexes",   "Auto per partition","8+","activity_events and audit_logs per partition"],
    ],
    [1800,1500,800,5260],
    C.green
  ),
  ...sp(1),
  H("5.2  Critical Query Patterns & Indexes", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Query Pattern","Index Used","Estimated Performance"],
    [
      ["Dashboard: streak + mood today for user",   "idx_journal_user_date + idx_streaks_user",              "< 2ms (index scan, < 10 rows)"],
      ["Mood calendar: all entries for month",      "idx_journal_user_date (partial: not deleted)",          "< 5ms (index range scan)"],
      ["Semantic search: similar journal entries",  "idx_journal_embedding_vector (IVFFlat cosine)",         "< 50ms (ANN search, top-5)"],
      ["Full-text search: keyword in journals",     "idx_journal_tsv (GIN)",                                 "< 10ms"],
      ["Analytics: 30-day mood trend for user",     "idx_journal_analytics_mood (partial)",                  "< 20ms (index only scan)"],
      ["AI Coach: retrieve relevant memories",      "idx_ai_memory_embedding (IVFFlat)",                     "< 30ms (ANN top-10)"],
      ["Habit correlation: join journals + logs",   "idx_habit_logs_correlation + idx_journal_analytics_mood", "< 50ms (merge join)"],
      ["Notification delivery: due reminders",      "idx_notif_delivery (partial: unsent)",                  "< 5ms (few rows expected)"],
      ["Active subscription check (per request)",   "idx_subscriptions_active_user (unique partial)",        "< 1ms (unique index lookup)"],
      ["Heatmap: all 365-day entries for user",     "idx_journal_date_range (covering index with INCLUDE)", "< 10ms (index only)"],
    ],
    [3000,3000,3360],
    C.teal
  ),
  ...sp(1),
  H("5.3  Partitioned Tables", HeadingLevel.HEADING_2, C.indigo),
  callout("activity_events and audit_logs are RANGE-partitioned by created_at. This allows instant partition pruning for time-range queries, fast bulk deletes of old data, and prevents table bloat."),
  T(
    ["Table","Partition Strategy","Retention","Reason"],
    [
      ["activity_events", "Monthly partitions (RANGE on created_at)", "12 months",  "High write volume. ~10K events/day at scale. Month partitions enable fast DROP for retention."],
      ["audit_logs",      "Quarterly partitions (RANGE on created_at)","7 years",  "Compliance requirement. Lower volume than activity. Quarterly for manageable partition count."],
    ],
    [1600,2500,1200,4060],
    C.amber
  ),
  ...sp(1),
  H("5.4  Vector Index Configuration", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Table","Column","Index Type","Lists","When to Use HNSW"],
    [
      ["journal_embeddings", "embedding VECTOR(1536)", "IVFFlat (lists=100)", "100", "Upgrade to HNSW when > 1M rows"],
      ["coach_messages",     "embedding VECTOR(1536)", "IVFFlat (lists=50)",  "50",  "Upgrade when > 500K rows"],
      ["ai_user_memory",     "embedding VECTOR(1536)", "IVFFlat (lists=50)",  "50",  "Upgrade when > 500K rows"],
    ],
    [1800,2000,1800,1000,3760],
    C.violet
  ),
  P("IVFFlat rule of thumb: lists = sqrt(total_rows). Rebuild index when table grows 10x.", { italic:true, color:C.slate }),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — MATERIALIZED VIEWS & ANALYTICS
// ═══════════════════════════════════════════════════════════════
const sec6 = [
  sectionTitle("📊","SECTION 6 — ANALYTICS SYSTEM"),
  hr(),
  H("6.1  Materialized Views", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["View","Granularity","Key Columns","Refresh Schedule","Used By"],
    [
      ["mv_daily_user_stats",   "1 row per user per day",  "mood_score, energy_score, stress_intensity, gratitude_count, emotion_count, all AI scores, habits_done", "Nightly 02:00 UTC", "Dashboard, Analytics page, AI insight generation"],
      ["mv_weekly_user_stats",  "1 row per user per week", "avg_mood, avg_energy, avg_stress, total_words, avg_*_ai scores", "Nightly 02:00 UTC", "Weekly insight cards, AI weekly report"],
      ["mv_monthly_user_stats", "1 row per user per month","All averages + totals, max_streak", "Nightly 02:00 UTC", "Memory book generation, AI monthly narrative"],
    ],
    [1800,1600,2800,1600,2560],
    C.green
  ),
  ...sp(1),
  H("6.2  Analytics Functions (callable by API)", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Function","Parameters","Returns","Use Case"],
    [
      ["get_mood_calendar",          "user_id, year, month",      "TABLE(entry_date, mood_score, mood_category, has_journal)",  "Mood calendar widget"],
      ["get_dashboard_data",         "user_id",                   "JSONB (streak, mood_today, xp, garden_level, weekly_avg...)", "Single-query dashboard load"],
      ["search_journals_semantic",   "user_id, embedding, limit, threshold", "TABLE(entry_id, entry_date, similarity, snippet)", "AI Coach context retrieval + search"],
      ["search_journals_text",       "user_id, query, limit",     "TABLE(entry_id, entry_date, rank, snippet with highlights)", "Search page full-text"],
      ["check_feature",              "user_id, slug",             "BOOLEAN",                                                   "API middleware feature gate"],
      ["user_can_use_feature",       "user_id, feature",          "BOOLEAN",                                                   "Plan-based feature check"],
    ],
    [2200,2200,2600,2360],
    C.indigo
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — TRIGGER AUTOMATION MAP
// ═══════════════════════════════════════════════════════════════
const sec7 = [
  sectionTitle("⚙️","SECTION 7 — TRIGGER & AUTOMATION MAP"),
  hr(),
  H("7.1  Trigger Inventory", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Trigger Name","Table","Event","Function","Effect"],
    [
      ["trg_on_auth_user_created", "auth.users",         "AFTER INSERT",          "handle_new_user()",         "Creates profiles + user_preferences row"],
      ["trg_profiles_updated",     "profiles",           "BEFORE UPDATE",         "touch_updated_at()",        "Auto-sets updated_at = NOW()"],
      ["trg_preferences_updated",  "user_preferences",   "BEFORE UPDATE",         "touch_updated_at()",        "Auto-sets updated_at = NOW()"],
      ["trg_journal_tsv",          "journal_entries",    "BEFORE INSERT/UPDATE",  "update_journal_tsv()",      "Rebuilds main_story_tsv tsvector, updates word_count"],
      ["trg_journal_mood_category","journal_entries",    "BEFORE INSERT/UPDATE",  "set_mood_category()",       "Derives mood_category from mood_score (1-10 → ENUM)"],
      ["trg_completion_pct",       "journal_entries",    "BEFORE INSERT/UPDATE",  "calculate_completion_pct()","Calculates 0–100% from filled optional fields"],
      ["trg_journal_updated",      "journal_entries",    "BEFORE UPDATE",         "touch_updated_at()",        "Auto-sets updated_at = NOW()"],
      ["trg_update_streak",        "journal_entries",    "AFTER INSERT/UPDATE",   "update_streak_on_entry()",  "Maintains current_streak, longest_streak, archives broken streaks"],
      ["trg_grow_garden",          "journal_entries",    "AFTER INSERT/UPDATE",   "grow_garden_plant()",       "Creates garden_plants row, updates garden level"],
      ["trg_xp_journal",           "journal_entries",    "AFTER INSERT/UPDATE",   "award_xp_on_journal()",     "Awards XP based on completion_pct and word_count"],
      ["trg_message_tsv",          "coach_messages",     "BEFORE INSERT/UPDATE",  "update_message_tsv()",      "Builds content_tsv for FTS on coach messages"],
      ["trg_life_wheel_score",     "life_wheel_entries", "BEFORE INSERT/UPDATE",  "compute_life_wheel_score()","Averages all 8 dimension scores → overall_score"],
      ["trg_sync_plan",            "subscriptions",      "AFTER INSERT/UPDATE",   "sync_plan_to_profile()",    "Syncs subscription plan → profiles.plan (denormalization)"],
      ["trg_subscriptions_updated","subscriptions",      "BEFORE UPDATE",         "touch_updated_at()",        "Auto-sets updated_at = NOW()"],
      ["trg_create_referral_code", "profiles",           "AFTER INSERT",          "create_referral_code()",    "Auto-creates referral code for every new user"],
      ["trg_trim_search_history",  "search_history",     "AFTER INSERT",          "trim_search_history()",     "Keeps only last 50 searches per user"],
      ["audit_subscriptions",      "subscriptions",      "AFTER INSERT/UPDATE/DELETE","audit_trigger_fn()",    "Writes to audit_logs for compliance"],
      ["audit_payment_transactions","payment_transactions","AFTER INSERT/UPDATE/DELETE","audit_trigger_fn()",  "Writes to audit_logs for billing audit"],
      ["audit_profiles_sensitive", "profiles",           "AFTER UPDATE of plan/is_deleted","audit_trigger_fn()","Audit plan changes & deletions"],
    ],
    [2200,1800,1400,2000,2960],
    C.slate
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — MULTI-DEVICE SYNC
// ═══════════════════════════════════════════════════════════════
const sec8 = [
  sectionTitle("📱","SECTION 8 — MULTI-DEVICE SYNC ARCHITECTURE"),
  hr(),
  H("8.1  Sync Strategy", HeadingLevel.HEADING_2, C.indigo),
  callout("MindBloom uses an Optimistic Updates + Server Reconciliation strategy. Mobile apps write locally first (fast UX), then sync to server. Conflicts use Last-Write-Wins with client timestamp as tiebreaker."),
  T(
    ["Scenario","Strategy","Implementation"],
    [
      ["Online write (web/mobile)",  "Immediate Supabase write",    "Standard API call → Supabase REST. No sync_queue needed."],
      ["Offline write (mobile)",     "Local SQLite → sync_queue",   "Write to SQLite locally. Queue entry in sync_queue with client_ts. Sync when online."],
      ["Conflict: same day journal", "Last-Write-Wins by client_ts","Server compares client_ts against existing entry's updated_at. Latest wins."],
      ["Conflict: diverged state",   "Client notified",             "conflict = TRUE in sync_queue. App shows conflict resolution UI."],
      ["Real-time sync (multi-tab)", "Supabase Realtime",           "Subscribe to journal_entries changes for user_id. Instant sync across browser tabs."],
      ["Device token refresh",       "user_devices table",          "UPSERT on (user_id, device_id). push_token updated on each app launch."],
    ],
    [1800,1800,5760],
    C.blue
  ),
  ...sp(1),
  H("8.2  sync_queue Table Flow", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Column","Purpose"],
    [
      ["operation",    "'upsert' | 'delete' — what the client did offline"],
      ["table_name",   "Which table was affected (e.g., 'journal_entries')"],
      ["record_id",    "UUID of the record being synced"],
      ["payload",      "Full JSONB snapshot of the record from client"],
      ["client_ts",    "Timestamp from client device (used for conflict resolution)"],
      ["conflict",     "Set TRUE by server if server version is newer than client_ts"],
      ["conflict_data","JSONB of server's version if conflict=TRUE (shown to user for manual resolution)"],
      ["resolved",     "Set TRUE by client after acknowledging the sync result"],
    ],
    [1600,7760],
    C.teal
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — AI RETRIEVAL ARCHITECTURE
// ═══════════════════════════════════════════════════════════════
const sec9 = [
  sectionTitle("🤖","SECTION 9 — AI RETRIEVAL & CONTEXT ARCHITECTURE"),
  hr(),
  H("9.1  AI Context Pipeline", HeadingLevel.HEADING_2, C.indigo),
  callout("When a user opens AI Coach, the system assembles context from 4 sources: (1) today's journal entry, (2) semantically similar past journals via vector search, (3) relevant long-term memories from ai_user_memory, (4) recent coach message history. This gives GPT-4o full context without exceeding token limits."),
  T(
    ["Context Source","Table","Retrieval Method","Token Budget","Priority"],
    [
      ["Today's journal",       "journal_entries",  "Direct query by user_id + today's date",             "~800 tokens",  "1 — Always included"],
      ["Long-term memory",      "ai_user_memory",   "Embedding similarity (IVFFlat cosine, top-5)",       "~400 tokens",  "2 — If relevant memories exist"],
      ["Similar past journals", "journal_embeddings","Embedding similarity (IVFFlat cosine, top-3)",      "~600 tokens",  "3 — For pattern recognition"],
      ["Recent coach history",  "coach_messages",   "Direct query: last 10 messages in current session", "~600 tokens",  "4 — Conversation continuity"],
      ["User profile facts",    "profiles + prefs", "Direct query (plan, timezone, preferences)",        "~100 tokens",  "5 — Personalization"],
    ],
    [1800,1800,2500,1200,2060],
    C.violet
  ),
  ...sp(1),
  H("9.2  Embedding Generation Flow", HeadingLevel.HEADING_2, C.indigo),
  T(
    ["Step","Where","Trigger","Action"],
    [
      ["1. Journal saved",           "Supabase DB",        "User clicks 'Simpan Jurnal'",                 "journal_entries row inserted/updated with is_draft=FALSE"],
      ["2. Realtime event fires",    "Supabase Realtime",  "DB change broadcast",                         "Edge Function 'process-journal' triggered"],
      ["3. Content assembled",       "Edge Function",      "After receiving entry",                       "Concatenate main_story + recurring_thoughts + happy_moments"],
      ["4. Embedding generated",     "OpenAI API",         "POST /v1/embeddings",                         "text-embedding-3-small → VECTOR(1536)"],
      ["5. Emotion analysis",        "OpenAI API",         "POST /v1/chat/completions",                   "gpt-4o-mini → JSON scores for 7 EI dimensions"],
      ["6. Memory extraction",       "OpenAI API (async)", "After analysis",                              "gpt-4o-mini → extract facts/patterns → ai_user_memory"],
      ["7. Insight generation",      "OpenAI API (async)", "After analysis",                              "gpt-4o-mini → daily insight → ai_insights table"],
      ["8. Content hash saved",      "Supabase DB",        "After all AI calls complete",                 "SHA256 of content saved to journal_embeddings.content_hash"],
    ],
    [500,1600,2200,5060],
    C.pink
  ),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — SCALABILITY & PERFORMANCE
// ═══════════════════════════════════════════════════════════════
const sec10 = [
  sectionTitle("📈","SECTION 10 — SCALABILITY PLAN"),
  hr(),
  T(
    ["Scale Milestone","Users","DB Action Required","Notes"],
    [
      ["MVP Launch",          "< 5K MAU",     "Default Supabase Pro plan (8GB RAM, shared compute)",   "No changes needed. Current schema handles this easily."],
      ["Growth",              "5K–50K MAU",   "Upgrade Supabase compute tier. Add read replica.",      "Enable pg_cron. Monitor slow queries via pg_stat_statements."],
      ["Scale",               "50K–200K MAU", "Dedicated Supabase instance. Upgrade IVFFlat → HNSW on vector indexes.", "Partition activity_events more granularly if needed."],
      ["Hyper-Growth",        "> 200K MAU",   "Connection pooling (PgBouncer). Read replicas for analytics.", "Move mv_* reads to replica. Consider TimescaleDB for time-series."],
      ["Enterprise",          "> 1M MAU",     "Multi-region Supabase. Citus for horizontal sharding if needed.", "Separate OLTP (Supabase) from OLAP (BigQuery/Redshift)."],
    ],
    [1200,1200,3000,4060],
    C.green
  ),
  ...sp(1),
  H("10.1  AI Cost Optimization", HeadingLevel.HEADING_2, C.indigo),
  B("Use gpt-4o-mini for emotion analysis & memory extraction (10x cheaper than gpt-4o)."),
  B("Use text-embedding-3-small for embeddings (5x cheaper than text-embedding-ada-002, same quality)."),
  B("Cache embeddings: content_hash prevents re-generating if journal text unchanged."),
  B("Batch emotion analysis: process via queue, not real-time (saves cold-start latency)."),
  B("Rate limit AI Coach: 3 sessions/day for free users, unlimited Premium."),
  B("Monitor cost per user via tokens_input + tokens_output on coach_sessions. Alert if > $0.05/user/day."),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 11 — DEPLOYMENT GUIDE
// ═══════════════════════════════════════════════════════════════
const sec11 = [
  sectionTitle("🚀","SECTION 11 — SUPABASE DEPLOYMENT GUIDE"),
  hr(),
  H("11.1  Setup Steps", HeadingLevel.HEADING_2, C.indigo),
  N("Create Supabase project at supabase.com. Choose Southeast Asia (Singapore) region."),
  N("In Dashboard → SQL Editor, run migration files in order: 000 → 012."),
  N("Enable extensions in Dashboard: uuid-ossp, pgcrypto, vector, pg_trgm, unaccent."),
  N("Configure Google OAuth: Dashboard → Auth → Providers → Google. Add client ID + secret."),
  N("Create Storage bucket 'memory-books' with public=false and RLS policy."),
  N("Set environment variables in .env.local: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, MIDTRANS_SERVER_KEY."),
  N("Deploy Edge Functions for: process-journal, ai-coach, generate-memory-book, midtrans-webhook."),
  N("Enable pg_cron extension (requires Supabase Pro). Run cron.schedule() commands from file 011."),
  N("Initialize materialized views: SELECT public.refresh_analytics_views(); (first-time seed)."),
  N("Test RLS by logging in as a test user and verifying no cross-user data leakage."),
  ...sp(1),
  H("11.2  Supabase CLI Quick Reference", HeadingLevel.HEADING_2, C.indigo),
  code("supabase init                           # Initialize project"),
  code("supabase db push                        # Push migrations to remote"),
  code("supabase db diff --schema public        # Diff local vs remote"),
  code("supabase gen types typescript --local   # Generate TypeScript types"),
  code("supabase functions deploy process-journal   # Deploy Edge Function"),
  code("supabase secrets set OPENAI_API_KEY=sk-...  # Set secrets for Edge Functions"),
  ...sp(1), PB()
];

// ═══════════════════════════════════════════════════════════════
// SECTION 12 — ENUM TYPES REFERENCE
// ═══════════════════════════════════════════════════════════════
const sec12 = [
  sectionTitle("📝","SECTION 12 — ENUM TYPES & CONSTANTS REFERENCE"),
  hr(),
  T(
    ["ENUM Type","Values","Used In"],
    [
      ["user_plan",          "free, premium, pro",                                              "profiles.plan, subscriptions.plan, feature_flags.enabled_plans"],
      ["subscription_status","active, trialing, past_due, canceled, paused",                   "subscriptions.status"],
      ["payment_status",     "pending, success, failed, expired, refunded",                    "payment_transactions.status"],
      ["notification_type",  "streak_reminder, streak_milestone, weekly_insight, monthly_book_ready, achievement_earned, ai_insight, subscription_expiring, subscription_renewed, welcome", "notification_queue.type"],
      ["notification_channel","push, email, in_app",                                           "notification_queue.channel"],
      ["achievement_category","streak, reflection, gratitude, consistency, growth, social",    "achievement_definitions.category"],
      ["garden_level",       "seed, sprout, plant, tree, forest",                              "gardens.level"],
      ["emotion_valence",    "positive, negative, neutral, mixed",                             "journal_emotions.valence"],
      ["mood_category",      "happy, calm, excited, anxious, stressed, sad, emotional, tired", "journal_entries.mood_category"],
      ["device_platform",    "web, ios, android",                                              "user_devices.platform, journal_entries.device_platform"],
      ["audit_action",       "INSERT, UPDATE, DELETE, SELECT_SENSITIVE",                       "audit_logs.action"],
      ["billing_interval",   "monthly, yearly, lifetime",                                      "subscriptions.billing_interval"],
      ["insight_period",     "daily, weekly, monthly, yearly",                                 "ai_insights.period"],
      ["habit_frequency",    "daily, weekly, custom",                                          "habits.frequency"],
      ["ai_model",           "gpt-4o, gpt-4o-mini, claude-3-5-sonnet, claude-3-haiku",        "coach_sessions.model, emotion_analysis.model_used"],
    ],
    [1800,3800,3760],
    C.slate
  ),
  ...sp(2),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:200,after:40},
    children:[new TextRun({ text:"🌱  MindBloom Database — Production Ready  🌱", font:"Arial", size:28, bold:true, color:C.indigo })] }),
  new Paragraph({ alignment:AlignmentType.CENTER, children:[
    new TextRun({ text:"55 Tables · 65+ RLS Policies · 80+ Indexes · Scalable to 1M+ users", font:"Arial", size:20, italic:true, color:C.slate })] }),
  new Paragraph({ alignment:AlignmentType.CENTER, children:[
    new TextRun({ text:"PostgreSQL 15 + Supabase + pgvector + pg_trgm + pg_cron", font:"Arial", size:18, color:C.slate })] }),
];

// ═══════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════
const doc = new Document({
  numbering:{
    config:[
      { reference:"bullets", levels:[
        { level:0, format:LevelFormat.BULLET, text:"•", alignment:AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:480, hanging:240 } } } },
        { level:1, format:LevelFormat.BULLET, text:"◦", alignment:AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:840, hanging:240 } } } },
      ]},
      { reference:"numbers", levels:[
        { level:0, format:LevelFormat.DECIMAL, text:"%1.", alignment:AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:480, hanging:240 } } } },
      ]},
    ]
  },
  styles:{
    default:{ document:{ run:{ font:"Arial", size:22, color:C.slate } } },
    paragraphStyles:[
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:44, bold:true, font:"Arial", color:C.dark },
        paragraph:{ spacing:{ before:480, after:160 }, outlineLevel:0 } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:32, bold:true, font:"Arial", color:C.indigo },
        paragraph:{ spacing:{ before:320, after:120 }, outlineLevel:1 } },
      { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:26, bold:true, font:"Arial", color:C.violet },
        paragraph:{ spacing:{ before:200, after:80 }, outlineLevel:2 } },
    ]
  },
  sections:[{
    properties:{
      page:{
        size:{ width:12240, height:15840 },
        margin:{ top:1080, right:1080, bottom:1080, left:1080 }
      }
    },
    headers:{
      default: new Header({ children:[
        new Paragraph({
          border:{ bottom:{ style:BorderStyle.SINGLE, size:4, color:C.indigo, space:1 } },
          spacing:{ before:0, after:120 },
          children:[new TextRun({ text:"🌱  MindBloom — Database Design & Technical Documentation  v1.0", font:"Arial", size:18, color:C.indigo })]
        })
      ]})
    },
    footers:{
      default: new Footer({ children:[
        new Paragraph({
          border:{ top:{ style:BorderStyle.SINGLE, size:4, color:C.indigo, space:1 } },
          spacing:{ before:120, after:0 },
          tabStops:[{ type:TabStopType.RIGHT, position:9360 }],
          children:[
            new TextRun({ text:"Confidential · May 2025   \t", font:"Arial", size:16, color:C.slate }),
            new TextRun({ children:[new SimpleField("PAGE")], font:"Arial", size:16, color:C.indigo }),
          ]
        })
      ]})
    },
    children:[
      ...cover,
      ...sec1, ...sec2, ...sec3, ...sec4,
      ...sec5, ...sec6, ...sec7, ...sec8,
      ...sec9, ...sec10, ...sec11, ...sec12,
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/mnt/user-data/outputs/MindBloom_Database_Technical_Doc.docx', buf);
  console.log('✅ Done: MindBloom_Database_Technical_Doc.docx');
}).catch(e => { console.error(e); process.exit(1); });
