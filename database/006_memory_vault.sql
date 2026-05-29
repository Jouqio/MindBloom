-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 006_memory_vault.sql
-- Purpose: Monthly reflection books, annual reviews, highlights
-- ============================================================

-- ── MEMORY BOOKS ─────────────────────────────────────────────────────────────
CREATE TABLE public.memory_books (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_year     SMALLINT NOT NULL,
  period_month    SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  -- Computed stats
  total_entries   SMALLINT NOT NULL DEFAULT 0,
  avg_mood        NUMERIC(4,2),
  avg_energy      NUMERIC(4,2),
  -- AI-curated highlights
  best_moment     TEXT,                              -- top happy_moments entry
  biggest_lesson  TEXT,                              -- top lessons_learned entry
  top_gratitude   TEXT,                              -- most common gratitude theme
  top_person_mentioned TEXT,                          -- most mentioned name
  biggest_achievement TEXT,
  stress_theme    TEXT,                              -- most common stress source
  -- AI narrative
  ai_narrative    TEXT,                              -- 2–3 paragraph story
  ai_mood_story   TEXT,                              -- emotional arc of the month
  growth_summary  TEXT,
  -- Data blobs for rendering
  highlights_json JSONB DEFAULT '{}',               -- { best_moments: [], gratitudes: [], ... }
  emotion_distribution JSONB DEFAULT '{}',          -- { happy: 12, calm: 8, ... }
  mood_heatmap    JSONB DEFAULT '{}',               -- { "2025-05-01": 7, "2025-05-02": 6, ... }
  -- Status
  generated_at    TIMESTAMPTZ,
  is_ready        BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_url         TEXT,                             -- Supabase Storage path
  share_token     TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_year, period_month)
);

-- ── ANNUAL REVIEWS ────────────────────────────────────────────────────────────
CREATE TABLE public.annual_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year            SMALLINT NOT NULL,
  total_entries   INTEGER,
  total_words     INTEGER,
  longest_streak  INTEGER,
  avg_mood_year   NUMERIC(4,2),
  top_emotions    JSONB,
  top_gratitudes  JSONB,
  key_themes      TEXT[],
  growth_areas    JSONB,
  ai_year_story   TEXT,
  ai_year_title   TEXT,                             -- e.g., "Tahun Keberanian Kecil"
  goals_next_year TEXT[],
  generated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_memory_books_user ON public.memory_books(user_id, period_year DESC, period_month DESC);
CREATE INDEX idx_memory_books_ready ON public.memory_books(is_ready) WHERE is_ready = FALSE;
CREATE INDEX idx_annual_reviews_user ON public.annual_reviews(user_id, year DESC);
