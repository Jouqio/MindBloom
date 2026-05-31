-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 002_journal_core.sql
-- Purpose: Journal entries (15 steps), mood logs, emotions, js
--          gratitude items, energy tracking
-- ============================================================

-- ── JOURNAL ENTRIES ──────────────────────────────────────────────────────────
-- Central table — one row per journaling session
CREATE TABLE public.journal_entries (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  device_platform     device_platform DEFAULT 'web',

  -- Step 2: Mood Slider (1–10)
  mood_score          SMALLINT CHECK (mood_score BETWEEN 1 AND 10),
  mood_category       mood_category,                 -- derived from mood_score

  -- Step 4: Energy Battery (0–100)
  energy_score        SMALLINT CHECK (energy_score BETWEEN 0 AND 100),

  -- Step 5: Main Story
  main_story          TEXT,
  main_story_tsv      TSVECTOR,                      -- for full-text search

  -- Step 6: Recurring Thoughts
  recurring_thoughts  TEXT,

  -- Step 7: Stress Source + Intensity
  stress_source       TEXT,
  stress_intensity    SMALLINT CHECK (stress_intensity BETWEEN 1 AND 10),

  -- Step 8: Happy Moments
  happy_moments       TEXT,

  -- Step 10: Lessons Learned
  lessons_learned     TEXT,

  -- Step 11: Self-Reflection (structured)
  did_well            TEXT,
  improve_on          TEXT,
  do_differently      TEXT,

  -- Step 12: Self-Compassion
  self_compassion     TEXT,

  -- Step 13: Tomorrow's Intention
  tomorrow_intention  TEXT,

  -- Step 15: Prayer / Hope
  prayer_hope         TEXT,

  -- Metadata
  word_count          INTEGER DEFAULT 0,
  completion_pct      SMALLINT DEFAULT 0,            -- % of 15 steps filled
  is_draft            BOOLEAN NOT NULL DEFAULT FALSE,
  draft_step          SMALLINT DEFAULT 1,            -- which step draft is on
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  written_duration_sec INTEGER,                       -- seconds spent writing
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One entry per user per day (drafts excluded from unique check)
  UNIQUE NULLS NOT DISTINCT (user_id, entry_date, is_draft)
);

COMMENT ON TABLE public.journal_entries IS
  'Core journal entry — 15-step journaling session. One finalized entry per user per day.';
COMMENT ON COLUMN public.journal_entries.main_story_tsv IS
  'Auto-updated tsvector for Indonesian + English full-text search';

-- ── FULL-TEXT SEARCH TRIGGER ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_journal_tsv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.main_story_tsv := to_tsvector('indonesian',
    COALESCE(NEW.main_story, '') || ' ' ||
    COALESCE(NEW.recurring_thoughts, '') || ' ' ||
    COALESCE(NEW.stress_source, '') || ' ' ||
    COALESCE(NEW.happy_moments, '') || ' ' ||
    COALESCE(NEW.lessons_learned, '')
  );
  -- Update word count
  NEW.word_count := array_length(
    regexp_split_to_array(
      trim(COALESCE(NEW.main_story,'') || ' ' || COALESCE(NEW.recurring_thoughts,'')),
      '\s+'
    ), 1
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_journal_tsv
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_journal_tsv();

CREATE TRIGGER trg_journal_updated
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── EMOTION TAGS ─────────────────────────────────────────────────────────────
-- Step 3: Multi-select emotion picker
CREATE TABLE public.journal_emotions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id    UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emotion     TEXT NOT NULL,                         -- 'Senang' | 'Cemas' | etc.
  category    TEXT NOT NULL,                         -- 'positive' | 'negative' | 'anxious' | 'energy'
  valence     emotion_valence NOT NULL DEFAULT 'neutral',
  color_hex   TEXT,                                  -- for UI rendering
  icon        TEXT,                                  -- emoji icon
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GRATITUDE ITEMS ───────────────────────────────────────────────────────────
-- Step 9: Dynamic gratitude list (min 3 per entry)
CREATE TABLE public.gratitude_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id    UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AFFIRMATIONS (chosen per entry) ──────────────────────────────────────────
-- Step 14: Selected or custom affirmations
CREATE TABLE public.journal_affirmations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id        UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affirmation_text TEXT NOT NULL,
  is_custom       BOOLEAN NOT NULL DEFAULT FALSE,    -- user wrote it vs picked preset
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── QUICK MOOD LOGS ───────────────────────────────────────────────────────────
-- Dashboard quick mood check (outside full journal flow)
CREATE TABLE public.mood_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id    UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mood_score  SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  mood_emoji  TEXT,
  note        TEXT,
  source      TEXT NOT NULL DEFAULT 'dashboard'     -- 'dashboard' | 'journal' | 'widget'
);

-- ── DERIVE MOOD CATEGORY FUNCTION ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.derive_mood_category(score SMALLINT)
RETURNS mood_category LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE
    WHEN score >= 9 THEN 'happy'::mood_category
    WHEN score >= 7 THEN 'calm'::mood_category
    WHEN score >= 5 THEN 'excited'::mood_category
    WHEN score >= 4 THEN 'anxious'::mood_category
    WHEN score >= 3 THEN 'stressed'::mood_category
    WHEN score >= 2 THEN 'sad'::mood_category
    ELSE 'tired'::mood_category
  END;
END; $$;

CREATE OR REPLACE FUNCTION public.set_mood_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mood_score IS NOT NULL THEN
    NEW.mood_category := public.derive_mood_category(NEW.mood_score);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_journal_mood_category
  BEFORE INSERT OR UPDATE OF mood_score ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_mood_category();

-- ── JOURNAL ENTRY EMBEDDINGS (AI RAG) ────────────────────────────────────────
-- For semantic search and AI context retrieval
CREATE TABLE public.journal_embeddings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id    UUID NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  embedding   VECTOR(1536) NOT NULL,                -- OpenAI text-embedding-3-small
  model_used  TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  content_hash TEXT NOT NULL,                        -- SHA256 to detect staleness
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_journal_user_date ON public.journal_entries(user_id, entry_date DESC);
CREATE INDEX idx_journal_user_draft ON public.journal_entries(user_id, is_draft) WHERE is_draft = TRUE;
CREATE INDEX idx_journal_not_deleted ON public.journal_entries(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_journal_tsv ON public.journal_entries USING GIN(main_story_tsv);
CREATE INDEX idx_journal_mood ON public.journal_entries(user_id, mood_score);
CREATE INDEX idx_journal_date_range ON public.journal_entries(user_id, entry_date)
  WHERE is_deleted = FALSE AND is_draft = FALSE;

CREATE INDEX idx_emotions_entry ON public.journal_emotions(entry_id);
CREATE INDEX idx_emotions_user ON public.journal_emotions(user_id);
CREATE INDEX idx_emotions_text ON public.journal_emotions USING GIN(to_tsvector('simple', emotion));

CREATE INDEX idx_gratitude_entry ON public.gratitude_items(entry_id);
CREATE INDEX idx_gratitude_user ON public.gratitude_items(user_id);
CREATE INDEX idx_gratitude_text_gin ON public.gratitude_items USING GIN(to_tsvector('indonesian', text));

CREATE INDEX idx_mood_logs_user_time ON public.mood_logs(user_id, logged_at DESC);

-- Vector similarity search index (IVFFlat for ≤1M rows)
CREATE INDEX idx_journal_embedding_vector ON public.journal_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_journal_embedding_user ON public.journal_embeddings(user_id);
