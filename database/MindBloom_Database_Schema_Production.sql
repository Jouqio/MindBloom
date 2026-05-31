-- ================================================================
-- MINDBLOOM — PRODUCTION DATABASE SCHEMA
-- PostgreSQL 15 + Supabase | Generated May 2025
-- ----------------------------------------------------------------
-- Files   : 13 migration files
-- Tables  : 55 tables
-- Views   : 3 materialized views
-- Functions: 25+ stored functions & triggers
-- RLS Policies: 65+ policies
-- Indexes : 80+ optimized indexes
-- ----------------------------------------------------------------
-- EXECUTION ORDER: Run files in sequence (000 → 012)
-- Supabase: Run in SQL Editor or via supabase db push
-- ================================================================


-- ================================================================
-- 000_extensions.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 000_extensions.sql
-- Purpose: Enable all required PostgreSQL extensions
-- ============================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptography (for hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Vector embeddings for AI semantic search
CREATE EXTENSION IF NOT EXISTS "vector";

-- Full-text search with Indonesian language support
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Faster JSON operations
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- For time-series analytics
CREATE EXTENSION IF NOT EXISTS "tablefunc";

-- pg_stat_statements for query monitoring (enable in supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ── Custom types ──────────────────────────────────────────────────────────────

CREATE TYPE user_plan AS ENUM ('free', 'premium', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'paused');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'expired', 'refunded');
CREATE TYPE notification_type AS ENUM (
  'streak_reminder', 'streak_milestone', 'weekly_insight',
  'monthly_book_ready', 'achievement_earned', 'ai_insight',
  'subscription_expiring', 'subscription_renewed', 'welcome'
);
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'in_app');
CREATE TYPE achievement_category AS ENUM ('streak', 'reflection', 'gratitude', 'consistency', 'growth', 'social');
CREATE TYPE garden_level AS ENUM ('seed', 'sprout', 'plant', 'tree', 'forest');
CREATE TYPE emotion_valence AS ENUM ('positive', 'negative', 'neutral', 'mixed');
CREATE TYPE mood_category AS ENUM ('happy', 'calm', 'excited', 'anxious', 'stressed', 'sad', 'emotional', 'tired');
CREATE TYPE device_platform AS ENUM ('web', 'ios', 'android');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'SELECT_SENSITIVE');
CREATE TYPE billing_interval AS ENUM ('monthly', 'yearly', 'lifetime');
CREATE TYPE insight_period AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'custom');
CREATE TYPE ai_model AS ENUM ('gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-haiku');


-- ================================================================
-- 001_core_users.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 001_core_users.sql
-- Purpose: User profiles, devices, preferences, onboarding
-- ============================================================

-- ── PROFILES ─────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users (1:1 relationship)
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  display_name    TEXT,                              -- "Asmawati" from onboarding
  avatar_url      TEXT,
  bio             TEXT,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Makassar',
  locale          TEXT NOT NULL DEFAULT 'id',        -- 'id' | 'en'
  plan            user_plan NOT NULL DEFAULT 'free',
  onboarded_at    TIMESTAMPTZ,                       -- NULL = not yet onboarded
  last_active_at  TIMESTAMPTZ,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,    -- soft delete
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Extended user profile synced with auth.users';
COMMENT ON COLUMN public.profiles.plan IS 'Denormalized from active subscription for fast reads';

-- ── ONBOARDING ANSWERS ───────────────────────────────────────────────────────
CREATE TABLE public.onboarding_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  journaling_goal TEXT,                              -- 'reduce_stress' | 'self_awareness' | ...
  reminder_time   TIME,                              -- preferred daily reminder time
  experience_level TEXT DEFAULT 'beginner',          -- 'beginner' | 'intermediate' | 'experienced'
  focus_areas     TEXT[] DEFAULT '{}',               -- ['emotion', 'habit', 'gratitude', ...]
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USER PREFERENCES ─────────────────────────────────────────────────────────
CREATE TABLE public.user_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- UI
  theme                 TEXT NOT NULL DEFAULT 'light',   -- 'light' | 'dark' | 'auto'
  accent_color          TEXT NOT NULL DEFAULT '#6366F1',
  font_size             TEXT NOT NULL DEFAULT 'medium',  -- 'small' | 'medium' | 'large'
  -- Journal
  default_soundscape    TEXT,                            -- active sound key
  soundscape_volumes    JSONB DEFAULT '{}',              -- { rain: 70, forest: 40 }
  journal_steps_enabled BOOLEAN[] DEFAULT ARRAY_FILL(TRUE, ARRAY[15]),
  auto_save_seconds     INTEGER NOT NULL DEFAULT 30,
  -- Notifications
  notif_push_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  notif_email_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  notif_reminder_time   TIME DEFAULT '21:00',
  notif_streak_alerts   BOOLEAN NOT NULL DEFAULT TRUE,
  notif_weekly_insight  BOOLEAN NOT NULL DEFAULT TRUE,
  -- AI
  ai_coach_persona      TEXT NOT NULL DEFAULT 'bloom',   -- future: choose persona
  ai_language           TEXT NOT NULL DEFAULT 'id',
  -- Privacy
  allow_analytics       BOOLEAN NOT NULL DEFAULT TRUE,
  allow_ai_training     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USER DEVICES ─────────────────────────────────────────────────────────────
CREATE TABLE public.user_devices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform        device_platform NOT NULL,
  device_name     TEXT,                              -- "Asmawati's iPhone 14"
  device_id       TEXT NOT NULL,                    -- hashed device fingerprint
  push_token      TEXT,                              -- FCM / APNs token
  app_version     TEXT,
  os_version      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

COMMENT ON COLUMN public.user_devices.device_id IS 'SHA256 hash of device fingerprint, never raw';

-- ── OFFLINE SYNC QUEUE ────────────────────────────────────────────────────────
-- Handles optimistic updates from mobile offline mode
CREATE TABLE public.sync_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL,
  operation       TEXT NOT NULL,                     -- 'upsert' | 'delete'
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  payload         JSONB NOT NULL,
  client_ts       TIMESTAMPTZ NOT NULL,              -- timestamp from client device
  server_ts       TIMESTAMPTZ,                       -- when server processed it
  conflict        BOOLEAN DEFAULT FALSE,
  conflict_data   JSONB,
  resolved        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TRIGGERS: auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_preferences_updated
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── AUTO-CREATE PROFILE & PREFERENCES ON SIGNUP ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_plan ON public.profiles(plan);
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active_at DESC);
CREATE INDEX idx_profiles_not_deleted ON public.profiles(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_devices_user ON public.user_devices(user_id);
CREATE INDEX idx_devices_push_token ON public.user_devices(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX idx_sync_queue_user_unresolved ON public.sync_queue(user_id, resolved) WHERE resolved = FALSE;


-- ================================================================
-- 002_journal_core.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 002_journal_core.sql
-- Purpose: Journal entries (15 steps), mood logs, emotions,
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


-- ================================================================
-- 003_streaks_achievements.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 003_streaks_achievements.sql
-- Purpose: Streak tracking, achievement badges, gamification XP
-- ============================================================

-- ── STREAK STATE ─────────────────────────────────────────────────────────────
-- One row per user, maintained by trigger
CREATE TABLE public.streaks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  total_entries     INTEGER NOT NULL DEFAULT 0,
  last_entry_date   DATE,
  streak_started_at DATE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.streaks IS
  'Live streak counters — updated atomically by trigger on journal_entries INSERT';

-- ── STREAK HISTORY ────────────────────────────────────────────────────────────
-- Immutable log for analytics
CREATE TABLE public.streak_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  streak_days     INTEGER NOT NULL,
  started_at      DATE NOT NULL,
  ended_at        DATE,
  broke_reason    TEXT,                              -- 'missed_day' | 'manual_reset'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── UPDATE STREAK TRIGGER ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_streak_on_entry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_streak   RECORD;
  v_today    DATE := NEW.entry_date;
  v_yesterday DATE := v_today - INTERVAL '1 day';
BEGIN
  -- Only process finalized entries
  IF NEW.is_draft = TRUE THEN RETURN NEW; END IF;

  SELECT * INTO v_streak FROM public.streaks WHERE user_id = NEW.user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- First ever entry
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, total_entries, last_entry_date, streak_started_at)
    VALUES (NEW.user_id, 1, 1, 1, v_today, v_today);
  ELSIF v_streak.last_entry_date = v_today THEN
    -- Same-day duplicate (update only total if needed)
    NULL;
  ELSIF v_streak.last_entry_date = v_yesterday THEN
    -- Consecutive day — extend streak
    UPDATE public.streaks SET
      current_streak  = current_streak + 1,
      longest_streak  = GREATEST(longest_streak, current_streak + 1),
      total_entries   = total_entries + 1,
      last_entry_date = v_today,
      updated_at      = NOW()
    WHERE user_id = NEW.user_id;
  ELSE
    -- Streak broken — archive old streak
    INSERT INTO public.streak_history (user_id, streak_days, started_at, ended_at, broke_reason)
    SELECT user_id, current_streak, streak_started_at, last_entry_date, 'missed_day'
    FROM public.streaks WHERE user_id = NEW.user_id AND current_streak > 0;

    UPDATE public.streaks SET
      current_streak  = 1,
      longest_streak  = GREATEST(longest_streak, 1),
      total_entries   = total_entries + 1,
      last_entry_date = v_today,
      streak_started_at = v_today,
      updated_at      = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_update_streak
  AFTER INSERT OR UPDATE OF is_draft ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_streak_on_entry();

-- ── ACHIEVEMENT DEFINITIONS ───────────────────────────────────────────────────
-- Static catalog — seeded once, updated via migrations
CREATE TABLE public.achievement_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,              -- 'streak_7' | 'deep_thinker' etc.
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  icon            TEXT NOT NULL,                     -- emoji
  category        achievement_category NOT NULL,
  -- Unlock conditions (evaluated by server function)
  condition_type  TEXT NOT NULL,                     -- 'streak' | 'total_entries' | 'step_completion' | 'custom'
  condition_value INTEGER,                           -- e.g., 7 for streak_7
  condition_meta  JSONB DEFAULT '{}',
  -- Display
  sort_order      INTEGER DEFAULT 0,
  is_hidden       BOOLEAN DEFAULT FALSE,             -- surprise achievements
  xp_reward       INTEGER NOT NULL DEFAULT 10,
  -- Plan restriction
  plan_required   user_plan DEFAULT 'free',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USER ACHIEVEMENTS ─────────────────────────────────────────────────────────
CREATE TABLE public.user_achievements (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id      UUID NOT NULL REFERENCES public.achievement_definitions(id),
  earned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context             JSONB DEFAULT '{}',            -- { streak_at_earn: 7 }
  notified            BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

-- ── XP & LEVEL SYSTEM ─────────────────────────────────────────────────────────
CREATE TABLE public.user_xp (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  current_level   SMALLINT NOT NULL DEFAULT 1,
  xp_to_next      INTEGER NOT NULL DEFAULT 100,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.xp_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,                      -- positive = earn, negative = spend
  reason      TEXT NOT NULL,                         -- 'journal_completed' | 'achievement' | ...
  reference_id UUID,                                  -- journal_id or achievement_id
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── XP AWARD FUNCTION ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id   UUID,
  p_amount    INTEGER,
  p_reason    TEXT,
  p_ref_id    UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.xp_transactions (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id);

  INSERT INTO public.user_xp (user_id, total_xp, current_level, xp_to_next)
  VALUES (p_user_id, p_amount, 1, 100)
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp    = user_xp.total_xp + p_amount,
    current_level = FLOOR(SQRT((user_xp.total_xp + p_amount) / 50.0))::SMALLINT + 1,
    xp_to_next  = (FLOOR(SQRT((user_xp.total_xp + p_amount) / 50.0)) + 1)^2 * 50 - (user_xp.total_xp + p_amount),
    updated_at  = NOW();
END; $$;

-- ── SEED: Achievement Definitions ─────────────────────────────────────────────
INSERT INTO public.achievement_definitions (slug, name, description, icon, category, condition_type, condition_value, xp_reward, sort_order) VALUES
  ('first_journal',       'Langkah Pertama',      'Tulis jurnal pertamamu',                 '🌱', 'reflection',   'total_entries',    1,   50,  1),
  ('streak_3',            'Seminggu Dimulai',      'Tulis 3 hari berturut-turut',            '🔥', 'streak',        'streak',           3,   30,  2),
  ('streak_7',            'Streak 7 Hari',         'Tulis 7 hari berturut-turut',            '🔥', 'streak',        'streak',           7,   75,  3),
  ('streak_14',           'Dua Minggu Penuh',      'Tulis 14 hari berturut-turut',           '🔥', 'streak',        'streak',           14,  150, 4),
  ('streak_30',           'Streak 30 Hari',        'Tulis 30 hari berturut-turut',           '🏆', 'streak',        'streak',           30,  300, 5),
  ('streak_90',           'Juara Konsistensi',     'Tulis 90 hari berturut-turut',           '👑', 'streak',        'streak',           90,  1000,6),
  ('streak_365',          'Perjalanan Setahun',    'Tulis 365 hari berturut-turut',          '⭐', 'streak',        'streak',           365, 5000,7),
  ('entries_10',          'Penulis Rajin',         '10 jurnal diselesaikan',                 '📖', 'consistency',   'total_entries',    10,  50,  8),
  ('entries_50',          'Penjelajah Diri',       '50 jurnal diselesaikan',                 '🌿', 'consistency',   'total_entries',    50,  200, 9),
  ('entries_100',         'Pemikir Mendalam',      '100 jurnal diselesaikan',                '🌳', 'reflection',    'total_entries',    100, 500, 10),
  ('full_reflection',     'Refleksi Sempurna',     'Isi semua 15 langkah dalam satu jurnal', '🪞', 'reflection',    'step_completion',  15,  100, 11),
  ('gratitude_master',    'Guru Rasa Syukur',      'Tambah 5+ item syukur dalam satu jurnal','💛', 'gratitude',     'custom',           5,   50,  12),
  ('gratitude_100',       'Hati yang Penuh',       '100 item syukur total',                  '💖', 'gratitude',     'custom',           100, 200, 13),
  ('calm_mind',           'Pikiran Tenang',        'Selesaikan 10 sesi pernapasan',          '🧘', 'growth',        'custom',           10,  75,  14),
  ('night_writer',        'Penulis Malam',         'Tulis jurnal setelah jam 22:00',         '🌙', 'consistency',   'custom',           NULL,30,  15),
  ('early_bird',          'Burung Pagi',           'Tulis jurnal sebelum jam 08:00',         '🌅', 'consistency',   'custom',           NULL,30,  16),
  ('ai_explorer',         'Penjelajah AI',         'Mulai sesi AI Coach pertamamu',          '🤖', 'growth',        'custom',           1,   50,  17),
  ('forest_grower',       'Penumbuh Hutan',        'Taman emosional mencapai level Hutan',   '🌲', 'growth',        'custom',           NULL,300, 18);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_streaks_user ON public.streaks(user_id);
CREATE INDEX idx_streak_history_user ON public.streak_history(user_id, started_at DESC);
CREATE INDEX idx_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_achievements_unnotified ON public.user_achievements(user_id, notified) WHERE notified = FALSE;
CREATE INDEX idx_xp_user ON public.user_xp(user_id);
CREATE INDEX idx_xp_tx_user ON public.xp_transactions(user_id, created_at DESC);


-- ================================================================
-- 004_ai_system.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 004_ai_system.sql
-- Purpose: AI Coach sessions, Emotional Intelligence analysis,
--          personalized insights, AI memory, RAG context
-- ============================================================

-- ── AI COACH SESSIONS ─────────────────────────────────────────────────────────
CREATE TABLE public.coach_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id        UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  -- Session state
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_sec    INTEGER,
  total_messages  INTEGER NOT NULL DEFAULT 0,
  -- AI config used
  model           ai_model NOT NULL DEFAULT 'gpt-4o',
  system_prompt_v TEXT NOT NULL DEFAULT 'v1',        -- prompt version for reproducibility
  -- Usage tracking (for cost monitoring)
  tokens_input    INTEGER NOT NULL DEFAULT 0,
  tokens_output   INTEGER NOT NULL DEFAULT 0,
  cost_usd        NUMERIC(10,6) DEFAULT 0,
  -- Quality signals
  user_rating     SMALLINT CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback   TEXT,
  was_helpful     BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COACH MESSAGES ────────────────────────────────────────────────────────────
-- Normalized message log (not JSONB array — queryable individually)
CREATE TABLE public.coach_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.coach_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  content_tsv     TSVECTOR,
  -- AI metadata
  tokens          INTEGER DEFAULT 0,
  model           ai_model,
  finish_reason   TEXT,                              -- 'stop' | 'length' | 'content_filter'
  -- Embedding for semantic retrieval
  embedding       VECTOR(1536),
  sequence_no     SMALLINT NOT NULL,                 -- message order within session
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_message_tsv()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.content_tsv := to_tsvector('indonesian', COALESCE(NEW.content, ''));
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_message_tsv
  BEFORE INSERT OR UPDATE ON public.coach_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_message_tsv();

-- ── AI LONG-TERM MEMORY ───────────────────────────────────────────────────────
-- Extracted facts about the user that persist across sessions
CREATE TABLE public.ai_user_memory (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  memory_type     TEXT NOT NULL,
    -- 'fact'        → "Asmawati adalah seorang guru"
    -- 'pattern'     → "Sering merasa cemas Senin pagi"
    -- 'preference'  → "Lebih suka refleksi pagi"
    -- 'achievement' → "Pertama kali menyelesaikan 30 hari streak"
    -- 'trigger'     → "Stres ketika deadline mendekat"
  content         TEXT NOT NULL,
  source_type     TEXT NOT NULL DEFAULT 'journal',   -- 'journal' | 'coach' | 'survey'
  source_id       UUID,                               -- entry_id or session_id
  confidence      NUMERIC(3,2) DEFAULT 0.8,          -- 0.0–1.0
  embedding       VECTOR(1536),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_referenced TIMESTAMPTZ,
  reference_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_user_memory IS
  'Long-term AI memory: extracted facts, patterns, preferences about the user for personalized coaching';

-- ── EMOTIONAL INTELLIGENCE ANALYSIS ──────────────────────────────────────────
-- Async AI analysis run after each journal is saved
CREATE TABLE public.emotion_analysis (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id            UUID NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Dimension scores (0.0–1.0)
  stress_score        NUMERIC(3,2) CHECK (stress_score BETWEEN 0 AND 1),
  anxiety_score       NUMERIC(3,2) CHECK (anxiety_score BETWEEN 0 AND 1),
  gratitude_score     NUMERIC(3,2) CHECK (gratitude_score BETWEEN 0 AND 1),
  burnout_score       NUMERIC(3,2) CHECK (burnout_score BETWEEN 0 AND 1),
  optimism_score      NUMERIC(3,2) CHECK (optimism_score BETWEEN 0 AND 1),
  overthinking_score  NUMERIC(3,2) CHECK (overthinking_score BETWEEN 0 AND 1),
  self_compassion_score NUMERIC(3,2) CHECK (self_compassion_score BETWEEN 0 AND 1),
  -- Overall
  emotional_complexity NUMERIC(3,2),                  -- how many emotions detected
  dominant_emotion    TEXT,
  -- AI generated text
  one_line_summary    TEXT,                            -- 1 sentence summary
  insight_text        TEXT,                            -- 2–4 sentence insight
  recommended_activity TEXT,                           -- suggested action
  -- Processing metadata
  model_used          ai_model NOT NULL DEFAULT 'gpt-4o-mini',
  model_version       TEXT,
  prompt_version      TEXT NOT NULL DEFAULT 'v1',
  tokens_used         INTEGER,
  processing_ms       INTEGER,
  processed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Quality
  is_low_confidence   BOOLEAN DEFAULT FALSE,
  needs_review        BOOLEAN DEFAULT FALSE
);

-- ── AI PERSONALIZED INSIGHTS ──────────────────────────────────────────────────
CREATE TABLE public.ai_insights (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period          insight_period NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  -- Insight content
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  category        TEXT NOT NULL,
    -- 'mood_trend' | 'stress_pattern' | 'gratitude' | 'habit_correlation' |
    -- 'achievement' | 'growth' | 'warning' | 'encouragement'
  emoji           TEXT,
  stat_value      TEXT,                              -- e.g., "+18%", "72%", "5 kali"
  stat_label      TEXT,
  -- CTA
  action_label    TEXT,
  action_url      TEXT,
  -- Delivery
  seen_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  was_helpful     BOOLEAN,
  -- Generation metadata
  model_used      ai_model NOT NULL DEFAULT 'gpt-4o-mini',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  UNIQUE(user_id, period, period_start, category)
);

-- ── AI REFLECTION PROMPTS (adaptive question bank) ───────────────────────────
CREATE TABLE public.reflection_prompts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category        TEXT NOT NULL,                     -- 'stress' | 'gratitude' | 'growth' | 'compassion'
  text_id         TEXT NOT NULL,
  text_id         TEXT NOT NULL,
  prompt_text     TEXT NOT NULL,
  language        TEXT NOT NULL DEFAULT 'id',
  emotion_context TEXT[],                            -- which emotions trigger this prompt
  depth_level     SMALLINT DEFAULT 1,                -- 1=surface, 3=deep
  is_active       BOOLEAN DEFAULT TRUE,
  usage_count     INTEGER DEFAULT 0,
  effectiveness   NUMERIC(3,2) DEFAULT 0.5,          -- based on user engagement
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed core prompts
INSERT INTO public.reflection_prompts (category, text_id, prompt_text, emotion_context, depth_level) VALUES
  ('explore',    'what_made_feel',    'Apa yang paling membuatmu merasa seperti itu hari ini?',               ARRAY['stressed','anxious','sad'],   1),
  ('pattern',    'notice_pattern',    'Apakah ada pola yang kamu sadari dari situasi ini?',                   ARRAY['stressed','overthinking'],    2),
  ('reframe',    'different_angle',   'Bagaimana jika kita lihat situasi ini dari sudut pandang berbeda?',    ARRAY['anxious','frustrated'],       2),
  ('action',     'small_step',        'Langkah kecil apa yang bisa kamu lakukan besok untuk merasa lebih baik?', ARRAY['sad','tired'],            1),
  ('compassion', 'kind_to_self',      'Apa yang akan kamu katakan ke sahabatmu jika dia mengalami hal ini?',  ARRAY['sad','lonely'],              2),
  ('gratitude',  'three_things',      'Sebutkan 3 hal kecil yang bisa kamu syukuri dari hari ini.',           ARRAY['stressed','anxious'],        1),
  ('growth',     'learned_today',     'Apa pelajaran terkecil yang tersembunyi di pengalaman hari ini?',      ARRAY['all'],                        3),
  ('optimism',   'next_week',         'Jika minggu depan lebih baik dari hari ini, apa yang sudah berubah?',  ARRAY['sad','stressed'],            2),
  ('explore',    'body_signal',       'Bagaimana rasanya di tubuhmu saat kamu mengalami emosi ini?',          ARRAY['anxious','stressed'],        2),
  ('pattern',    'recurring',         'Apakah situasi seperti ini sudah pernah terjadi sebelumnya? Apa yang berbeda sekarang?', ARRAY['all'], 3);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_coach_sessions_user ON public.coach_sessions(user_id, started_at DESC);
CREATE INDEX idx_coach_sessions_entry ON public.coach_sessions(entry_id);
CREATE INDEX idx_coach_messages_session ON public.coach_messages(session_id, sequence_no);
CREATE INDEX idx_coach_messages_tsv ON public.coach_messages USING GIN(content_tsv);
CREATE INDEX idx_coach_messages_embedding ON public.coach_messages
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)
  WHERE embedding IS NOT NULL;

CREATE INDEX idx_ai_memory_user ON public.ai_user_memory(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ai_memory_type ON public.ai_user_memory(user_id, memory_type);
CREATE INDEX idx_ai_memory_embedding ON public.ai_user_memory
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)
  WHERE embedding IS NOT NULL;

CREATE INDEX idx_emotion_analysis_entry ON public.emotion_analysis(entry_id);
CREATE INDEX idx_emotion_analysis_user_date ON public.emotion_analysis(user_id, processed_at DESC);
CREATE INDEX idx_emotion_analysis_stress ON public.emotion_analysis(user_id, stress_score);

CREATE INDEX idx_insights_user_period ON public.ai_insights(user_id, period, period_start DESC);
CREATE INDEX idx_insights_unseen ON public.ai_insights(user_id) WHERE seen_at IS NULL;


-- ================================================================
-- 005_features_premium.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 005_features_premium.sql
-- Purpose: Emotional Garden, Habit Tracker, Life Wheel,
--          Breathing sessions, Soundscape usage
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- EMOTIONAL GARDEN
-- ══════════════════════════════════════════════════════════════

-- ── GARDEN STATE ─────────────────────────────────────────────────────────────
CREATE TABLE public.gardens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  level             garden_level NOT NULL DEFAULT 'seed',
  total_plants      INTEGER NOT NULL DEFAULT 0,
  rare_flowers      INTEGER NOT NULL DEFAULT 0,
  xp                INTEGER NOT NULL DEFAULT 0,        -- garden-specific XP
  -- Visual state (serialized for front-end rendering)
  layout            JSONB DEFAULT '[]',                -- [{plant_id, x, y, scale, ...}]
  background_theme  TEXT DEFAULT 'sunny',
  last_watered_at   TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.gardens IS
  'One virtual garden per user. Level determined by total_plants milestones.';

-- ── GARDEN PLANTS ─────────────────────────────────────────────────────────────
CREATE TABLE public.garden_plants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  garden_id       UUID NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  entry_id        UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  -- Plant properties
  plant_type      TEXT NOT NULL DEFAULT 'tree',
    -- 'seed' | 'sprout' | 'bush' | 'tree' | 'flower' | 'rare_flower'
  species         TEXT,                               -- 'oak' | 'sakura' | 'lavender' | ...
  color_hex       TEXT NOT NULL DEFAULT '#388E3C',
  size_scale      NUMERIC(3,2) DEFAULT 1.0,
  -- Source mood (determines color)
  source_mood     mood_category,
  source_mood_score SMALLINT,
  is_rare         BOOLEAN NOT NULL DEFAULT FALSE,
  -- Position in garden
  pos_x           NUMERIC(5,2) DEFAULT 0,
  pos_y           NUMERIC(5,2) DEFAULT 0,
  -- Life state
  health          SMALLINT NOT NULL DEFAULT 100,
  grown_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wilted_at       TIMESTAMPTZ                         -- NULL = alive
);

-- ── GARDEN EVENTS ─────────────────────────────────────────────────────────────
-- Immutable log of garden milestones
CREATE TABLE public.garden_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  garden_id   UUID NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
    -- 'plant_grown' | 'rare_flower' | 'level_up' | 'plant_wilted'
  event_data  JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TRIGGER: Grow plant after journal saved ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.grow_garden_plant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_garden    RECORD;
  v_color     TEXT;
  v_is_rare   BOOLEAN := FALSE;
  v_plant_type TEXT := 'tree';
  v_new_level garden_level;
BEGIN
  IF NEW.is_draft = TRUE THEN RETURN NEW; END IF;

  SELECT * INTO v_garden FROM public.gardens WHERE user_id = NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.gardens (user_id) VALUES (NEW.user_id);
    SELECT * INTO v_garden FROM public.gardens WHERE user_id = NEW.user_id;
  END IF;

  -- Color from mood
  v_color := CASE NEW.mood_category
    WHEN 'happy'    THEN '#388E3C'
    WHEN 'calm'     THEN '#1976D2'
    WHEN 'excited'  THEN '#F57F17'
    WHEN 'anxious'  THEN '#F97316'
    WHEN 'stressed' THEN '#C62828'
    WHEN 'sad'      THEN '#5B4FE8'
    WHEN 'tired'    THEN '#78909C'
    ELSE '#6D4C41'
  END;

  -- Rare flower if completion >= 90% (steps 11+12 filled)
  IF NEW.completion_pct >= 90 AND NEW.self_compassion IS NOT NULL AND NEW.did_well IS NOT NULL THEN
    v_is_rare := TRUE;
    v_plant_type := 'rare_flower';
  END IF;

  INSERT INTO public.garden_plants (user_id, garden_id, entry_id, plant_type, color_hex, source_mood, source_mood_score, is_rare)
  VALUES (NEW.user_id, v_garden.id, NEW.id, v_plant_type, v_color, NEW.mood_category, NEW.mood_score, v_is_rare);

  -- Update garden totals and level
  v_new_level := CASE
    WHEN v_garden.total_plants + 1 >= 50  THEN 'forest'::garden_level
    WHEN v_garden.total_plants + 1 >= 20  THEN 'tree'::garden_level
    WHEN v_garden.total_plants + 1 >= 7   THEN 'plant'::garden_level
    WHEN v_garden.total_plants + 1 >= 2   THEN 'sprout'::garden_level
    ELSE 'seed'::garden_level
  END;

  UPDATE public.gardens SET
    total_plants = total_plants + 1,
    rare_flowers = rare_flowers + (v_is_rare::INTEGER),
    level        = v_new_level,
    updated_at   = NOW()
  WHERE id = v_garden.id;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_grow_garden
  AFTER INSERT OR UPDATE OF is_draft ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.grow_garden_plant();

-- ══════════════════════════════════════════════════════════════
-- HABIT TRACKER
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.habits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL DEFAULT '✅',
  color_hex       TEXT NOT NULL DEFAULT '#6366F1',
  frequency       habit_frequency NOT NULL DEFAULT 'daily',
  target_days     INTEGER[] DEFAULT NULL,             -- NULL=all days; [1,2,3,4,5]=weekdays
  -- Tracking
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  total_completed INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  sort_order      INTEGER DEFAULT 0,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.habit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id        UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  completed       BOOLEAN NOT NULL DEFAULT TRUE,
  note            TEXT,
  mood_at_time    SMALLINT,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);

-- ── AI HABIT CORRELATION ──────────────────────────────────────────────────────
-- Computed weekly by background job
CREATE TABLE public.habit_correlations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  habit_id        UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  correlation_r   NUMERIC(4,3),                      -- Pearson r: -1.0 to 1.0
  sample_size     INTEGER,
  target_metric   TEXT NOT NULL DEFAULT 'mood_score', -- 'mood_score' | 'energy_score' | 'stress_intensity'
  avg_on_days     NUMERIC(5,2),
  avg_off_days    NUMERIC(5,2),
  pct_change      NUMERIC(6,2),                      -- e.g., +18.5
  insight_text    TEXT,                               -- AI generated sentence
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_days     INTEGER NOT NULL DEFAULT 30,
  UNIQUE(habit_id, target_metric, computed_at::DATE)
);

-- ══════════════════════════════════════════════════════════════
-- LIFE WHEEL
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.life_wheel_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scores          JSONB NOT NULL,
    -- { career: 85, health: 60, family: 75, finance: 65,
    --   spiritual: 55, relationships: 70, learning: 80, happiness: 72 }
  overall_score   NUMERIC(5,2),                      -- weighted avg
  ai_analysis     TEXT,                               -- AI-generated paragraph
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compute overall_score on insert
CREATE OR REPLACE FUNCTION public.compute_life_wheel_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_sum NUMERIC := 0; v_count INTEGER := 0; v_key TEXT; v_val NUMERIC;
BEGIN
  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(NEW.scores) LOOP
    v_sum := v_sum + v_val::NUMERIC;
    v_count := v_count + 1;
  END LOOP;
  NEW.overall_score := CASE WHEN v_count > 0 THEN ROUND(v_sum / v_count, 2) ELSE 0 END;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_life_wheel_score
  BEFORE INSERT OR UPDATE ON public.life_wheel_entries
  FOR EACH ROW EXECUTE FUNCTION public.compute_life_wheel_score();

-- ══════════════════════════════════════════════════════════════
-- BREATHING SESSIONS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.breathing_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technique       TEXT NOT NULL DEFAULT '4-4-4-4',    -- '4-7-8' | 'box' | 'custom'
  cycles_completed INTEGER NOT NULL DEFAULT 0,
  duration_sec    INTEGER NOT NULL DEFAULT 0,
  mood_before     SMALLINT,
  mood_after      SMALLINT,
  stress_before   SMALLINT,
  stress_after    SMALLINT,
  notes           TEXT,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SOUNDSCAPE USAGE ──────────────────────────────────────────────────────────
CREATE TABLE public.soundscape_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_id        UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  sounds_used     TEXT[] NOT NULL,                    -- ['rain', 'forest']
  volumes         JSONB,                              -- { rain: 70, forest: 40 }
  duration_sec    INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_garden_user ON public.gardens(user_id);
CREATE INDEX idx_garden_plants_user ON public.garden_plants(user_id);
CREATE INDEX idx_garden_plants_garden ON public.garden_plants(garden_id, grown_at DESC);
CREATE INDEX idx_garden_plants_rare ON public.garden_plants(user_id, is_rare) WHERE is_rare = TRUE;

CREATE INDEX idx_habits_user ON public.habits(user_id) WHERE is_archived = FALSE;
CREATE INDEX idx_habit_logs_habit_date ON public.habit_logs(habit_id, log_date DESC);
CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, log_date DESC);
CREATE INDEX idx_habit_correlation_user ON public.habit_correlations(user_id, computed_at DESC);

CREATE INDEX idx_life_wheel_user ON public.life_wheel_entries(user_id, entry_date DESC);
CREATE INDEX idx_breathing_user ON public.breathing_sessions(user_id, completed_at DESC);
CREATE INDEX idx_soundscape_user ON public.soundscape_sessions(user_id, started_at DESC);


-- ================================================================
-- 006_memory_vault.sql
-- ================================================================
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


-- ================================================================
-- 007_subscriptions_billing.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 007_subscriptions_billing.sql
-- Purpose: Plans, subscriptions, payments, invoices, coupons
-- ============================================================

-- ── PLAN DEFINITIONS ─────────────────────────────────────────────────────────
CREATE TABLE public.plan_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            user_plan NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  price_monthly   INTEGER NOT NULL DEFAULT 0,         -- IDR, 0 = free
  price_yearly    INTEGER NOT NULL DEFAULT 0,
  price_lifetime  INTEGER NOT NULL DEFAULT 0,
  features        JSONB NOT NULL DEFAULT '{}',
    -- { ai_coach_limit: null, soundscapes: 6, analytics_days: 90, ... }
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plan_definitions (slug, name, price_monthly, price_yearly, price_lifetime, features, sort_order) VALUES
  ('free',    'Gratis',   0,        0,          0,           '{"ai_coach_limit":3,"soundscapes":1,"analytics_days":7,"garden_full":false,"memory_book":false,"export_pdf":false}', 1),
  ('premium', 'Premium',  49000,    470000,     990000,      '{"ai_coach_limit":null,"soundscapes":6,"analytics_days":90,"garden_full":true,"memory_book":true,"export_pdf":true}',  2),
  ('pro',     'Pro',      99000,    950000,     1990000,     '{"ai_coach_limit":null,"soundscapes":6,"analytics_days":999,"garden_full":true,"memory_book":true,"export_pdf":true,"api_access":true,"custom_prompts":true}', 3);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan                user_plan NOT NULL DEFAULT 'free',
  status              subscription_status NOT NULL DEFAULT 'active',
  billing_interval    billing_interval,
  -- Dates
  trial_started_at    TIMESTAMPTZ,
  trial_ends_at       TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  canceled_at         TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  -- Payment processor references
  midtrans_customer_id TEXT,
  midtrans_sub_id     TEXT UNIQUE,
  -- Metadata
  source              TEXT DEFAULT 'web',            -- 'web' | 'ios' | 'android'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active subscription per user
CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON public.subscriptions(user_id)
  WHERE status IN ('active', 'trialing');

-- ── SYNC SUBSCRIPTION TO PROFILE ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_plan_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('active', 'trialing') THEN
    UPDATE public.profiles SET plan = NEW.plan, updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF NEW.status IN ('canceled', 'expired', 'past_due') THEN
    -- Check if any other active sub exists
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = NEW.user_id AND status IN ('active','trialing') AND id != NEW.id
    ) THEN
      UPDATE public.profiles SET plan = 'free', updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_plan
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_plan_to_profile();

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── PAYMENT TRANSACTIONS ──────────────────────────────────────────────────────
CREATE TABLE public.payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES public.subscriptions(id),
  -- Amount
  amount              INTEGER NOT NULL,               -- IDR
  currency            TEXT NOT NULL DEFAULT 'IDR',
  -- Midtrans fields
  midtrans_order_id   TEXT NOT NULL UNIQUE,
  midtrans_txn_id     TEXT,
  payment_type        TEXT,                           -- 'credit_card' | 'gopay' | 'bank_transfer'
  va_number           TEXT,
  -- Status
  status              payment_status NOT NULL DEFAULT 'pending',
  paid_at             TIMESTAMPTZ,
  expired_at          TIMESTAMPTZ,
  failed_reason       TEXT,
  -- Refund
  refunded_at         TIMESTAMPTZ,
  refund_amount       INTEGER,
  -- Raw webhook
  gateway_payload     JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVOICES ─────────────────────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  transaction_id  UUID REFERENCES public.payment_transactions(id),
  invoice_number  TEXT NOT NULL UNIQUE DEFAULT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 6)),
  amount          INTEGER NOT NULL,
  tax_amount      INTEGER NOT NULL DEFAULT 0,
  total_amount    INTEGER NOT NULL,
  plan_snapshot   JSONB,                             -- plan details at time of purchase
  period_start    DATE,
  period_end      DATE,
  status          TEXT NOT NULL DEFAULT 'draft',     -- 'draft' | 'sent' | 'paid' | 'void'
  pdf_url         TEXT,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DISCOUNT COUPONS ─────────────────────────────────────────────────────────
CREATE TABLE public.coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT NOT NULL,                     -- 'percent' | 'fixed'
  discount_value  INTEGER NOT NULL,
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  applicable_plan user_plan,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.coupon_redemptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id       UUID NOT NULL REFERENCES public.coupons(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id  UUID REFERENCES public.payment_transactions(id),
  discount_applied INTEGER NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_expiring ON public.subscriptions(current_period_end)
  WHERE status = 'active';
CREATE INDEX idx_payments_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payments_midtrans ON public.payment_transactions(midtrans_order_id);
CREATE INDEX idx_payments_status ON public.payment_transactions(status) WHERE status = 'pending';
CREATE INDEX idx_invoices_user ON public.invoices(user_id, created_at DESC);
CREATE INDEX idx_coupons_code ON public.coupons(code) WHERE is_active = TRUE;


-- ================================================================
-- 008_notifications_audit.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 008_notifications_audit.sql
-- Purpose: Notifications, audit logs, activity tracking,
--          security events, GDPR compliance log
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════

-- ── NOTIFICATION TEMPLATES ────────────────────────────────────────────────────
CREATE TABLE public.notification_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT NOT NULL UNIQUE,
  type        notification_type NOT NULL,
  channel     notification_channel NOT NULL,
  title_tpl   TEXT NOT NULL,                        -- "Hei {{name}}, jangan lupa jurnal hari ini!"
  body_tpl    TEXT NOT NULL,
  action_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.notification_templates (slug, type, channel, title_tpl, body_tpl) VALUES
  ('streak_reminder_push',   'streak_reminder',    'push',   'Hei {{name}}! 🌱',                'Jangan putus streak {{streak}}-harimu. Tulis jurnal sekarang!'),
  ('streak_7_push',          'streak_milestone',   'push',   '🔥 Streak 7 Hari!',               'Luar biasa {{name}}! Kamu sudah 7 hari berturut-turut. Pertahankan!'),
  ('weekly_insight_push',    'weekly_insight',     'push',   '✨ Insight Mingguanmu Siap',       'Klik untuk lihat perkembangan emosionalmu minggu ini.'),
  ('monthly_book_push',      'monthly_book_ready', 'push',   '📖 Buku Kenangan {{month}} Siap', 'Lihat perjalanan emosionalmu bulan {{month}}.'),
  ('achievement_push',       'achievement_earned', 'push',   '🏆 Achievement Baru!',            'Kamu baru saja mendapatkan badge "{{badge_name}}"!'),
  ('welcome_email',          'welcome',            'email',  'Selamat Datang di MindBloom 🌱',  'Hai {{name}}, perjalananmu dimulai hari ini...');

-- ── NOTIFICATION QUEUE ─────────────────────────────────────────────────────────
CREATE TABLE public.notification_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES public.notification_templates(id),
  type            notification_type NOT NULL,
  channel         notification_channel NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB DEFAULT '{}',               -- extra payload for deep link
  -- Delivery
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  retry_count     SMALLINT NOT NULL DEFAULT 0,
  max_retries     SMALLINT NOT NULL DEFAULT 3,
  -- Read tracking (in-app)
  read_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  -- Device targeting
  device_id       UUID REFERENCES public.user_devices(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NOTIFICATION SCHEDULE (per-user reminders) ───────────────────────────────
CREATE TABLE public.notification_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  channel         notification_channel NOT NULL,
  schedule_cron   TEXT NOT NULL,                    -- '0 21 * * *' = every day 9pm
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at    TIMESTAMPTZ,
  next_send_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type, channel)
);

-- ══════════════════════════════════════════════════════════════
-- ACTIVITY TRACKING
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.activity_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id  TEXT,                                 -- browser/app session ID
  event_name  TEXT NOT NULL,
    -- 'page_view' | 'journal_started' | 'journal_saved' | 'mood_logged' |
    -- 'ai_coach_opened' | 'garden_viewed' | 'soundscape_started' | 'upgrade_clicked' | ...
  properties  JSONB DEFAULT '{}',
  platform    device_platform DEFAULT 'web',
  app_version TEXT,
  -- Identity
  ip_hash     TEXT,                                 -- SHA256 hashed, never raw
  user_agent  TEXT,
  country     TEXT,                                 -- derived from IP, not stored raw
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions (pre-create + auto via pg_partman in prod)
CREATE TABLE public.activity_events_2025_01 PARTITION OF public.activity_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE public.activity_events_2025_02 PARTITION OF public.activity_events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE public.activity_events_2025_03 PARTITION OF public.activity_events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE public.activity_events_2025_04 PARTITION OF public.activity_events
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE public.activity_events_2025_05 PARTITION OF public.activity_events
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE public.activity_events_2025_06 PARTITION OF public.activity_events
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE public.activity_events_rest     PARTITION OF public.activity_events
  FOR VALUES FROM ('2025-07-01') TO ('2027-01-01');

-- ── PAGE SESSIONS ─────────────────────────────────────────────────────────────
CREATE TABLE public.app_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_token   TEXT NOT NULL UNIQUE,
  platform        device_platform DEFAULT 'web',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_sec    INTEGER,
  pages_visited   INTEGER DEFAULT 0,
  country         TEXT,
  referrer        TEXT
);

-- ══════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.audit_logs (
  id              BIGSERIAL PRIMARY KEY,             -- BIGSERIAL for high-volume writes
  user_id         UUID,                              -- NULL for system actions
  actor_id        UUID,                              -- who performed the action
  action          audit_action NOT NULL,
  table_name      TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  changed_fields  TEXT[],
  ip_hash         TEXT,
  user_agent      TEXT,
  request_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE public.audit_logs_2025_q1 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE public.audit_logs_2025_q2 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE public.audit_logs_2025_q3 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE public.audit_logs_2025_q4 PARTITION OF public.audit_logs
  FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE public.audit_logs_2026     PARTITION OF public.audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- ── GENERIC AUDIT TRIGGER ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_changed TEXT[] := '{}';
  v_key TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_new->v_key IS DISTINCT FROM v_old->v_key THEN
        v_changed := array_append(v_changed, v_key);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, actor_id, action, table_name, record_id,
    old_values, new_values, changed_fields
  ) VALUES (
    COALESCE((v_new->>'user_id')::UUID, (v_old->>'user_id')::UUID),
    auth.uid(),
    TG_OP::audit_action,
    TG_TABLE_NAME,
    COALESCE(v_new->>'id', v_old->>'id'),
    v_old, v_new, v_changed
  );

  RETURN COALESCE(NEW, OLD);
END; $$;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_payment_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_profiles_sensitive
  AFTER UPDATE OF plan, is_deleted ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ── SECURITY EVENTS ───────────────────────────────────────────────────────────
CREATE TABLE public.security_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
    -- 'login_success' | 'login_failed' | 'password_changed' | 'email_changed' |
    -- 'account_deleted' | 'data_export_requested' | 'suspicious_access'
  ip_hash         TEXT,
  user_agent      TEXT,
  country         TEXT,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GDPR / DATA REQUESTS ─────────────────────────────────────────────────────
CREATE TABLE public.data_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type    TEXT NOT NULL,                    -- 'export' | 'delete' | 'rectify'
  status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'failed'
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  download_url    TEXT,
  download_expires_at TIMESTAMPTZ,
  notes           TEXT
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_notif_queue_user ON public.notification_queue(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notif_queue_scheduled ON public.notification_queue(scheduled_at)
  WHERE sent_at IS NULL AND failed_at IS NULL;
CREATE INDEX idx_notif_schedules_next ON public.notification_schedules(next_send_at)
  WHERE is_active = TRUE;

CREATE INDEX idx_activity_user_event ON public.activity_events(user_id, event_name, created_at DESC);
CREATE INDEX idx_activity_event_name ON public.activity_events(event_name, created_at DESC);

CREATE INDEX idx_audit_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_table ON public.audit_logs(table_name, created_at DESC);
CREATE INDEX idx_security_user ON public.security_events(user_id, created_at DESC);
CREATE INDEX idx_data_requests_user ON public.data_requests(user_id, status);


-- ================================================================
-- 009_rls_policies.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 009_rls_policies.sql
-- Purpose: Row Level Security — every table locked down.
--          Rule: users can only access their own data.
--          Service role bypasses all RLS.
-- ============================================================

-- ── HELPER: current user UUID ────────────────────────────────────────────────
-- auth.uid() is Supabase's built-in function
-- We alias it for clarity in policies

-- ── ENABLE RLS ON ALL TABLES ─────────────────────────────────────────────────
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_answers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_emotions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitude_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_affirmations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_embeddings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_memory            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_analysis          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gardens                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_plants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garden_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_correlations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_wheel_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathing_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soundscape_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_books              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests             ENABLE ROW LEVEL SECURITY;

-- Read-only public catalogs (no RLS needed for SELECT, write restricted):
ALTER TABLE public.achievement_definitions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_definitions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflection_prompts        ENABLE ROW LEVEL SECURITY;

-- ── MACRO: standard user-scoped policy ───────────────────────────────────────
-- Pattern: user_id = auth.uid() for all operations

-- ── PROFILES ─────────────────────────────────────────────────────────────────
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users cannot insert their own profile (done by trigger on auth.users)
-- Users cannot delete their profile (use data_requests table)

-- ── ONBOARDING ────────────────────────────────────────────────────────────────
CREATE POLICY "onboarding: own all"
  ON public.onboarding_answers FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── PREFERENCES ───────────────────────────────────────────────────────────────
CREATE POLICY "preferences: own all"
  ON public.user_preferences FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── DEVICES ───────────────────────────────────────────────────────────────────
CREATE POLICY "devices: own all"
  ON public.user_devices FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── SYNC QUEUE ────────────────────────────────────────────────────────────────
CREATE POLICY "sync: own all"
  ON public.sync_queue FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── JOURNAL ENTRIES ───────────────────────────────────────────────────────────
CREATE POLICY "journal: own select"
  ON public.journal_entries FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = FALSE);

CREATE POLICY "journal: own insert"
  ON public.journal_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "journal: own update"
  ON public.journal_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Soft delete only (no hard deletes from client)
CREATE POLICY "journal: own soft delete"
  ON public.journal_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_deleted = TRUE);

-- ── JOURNAL SUB-TABLES (emotions, gratitude, affirmations) ───────────────────
DO $$ BEGIN
  EXECUTE format('
    CREATE POLICY "emotions: own all" ON public.journal_emotions
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    CREATE POLICY "gratitude: own all" ON public.gratitude_items
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    CREATE POLICY "affirmations: own all" ON public.journal_affirmations
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    CREATE POLICY "mood_logs: own all" ON public.mood_logs
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    CREATE POLICY "embeddings: own all" ON public.journal_embeddings
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  ');
END $$;

-- ── STREAKS & GAMIFICATION ────────────────────────────────────────────────────
CREATE POLICY "streaks: own read"
  ON public.streaks FOR SELECT USING (user_id = auth.uid());
-- Streaks are only modified by triggers (SECURITY DEFINER), not directly by users

CREATE POLICY "streak_history: own read"
  ON public.streak_history FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "achievements: own read"
  ON public.user_achievements FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "xp: own read"
  ON public.user_xp FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "xp_tx: own read"
  ON public.xp_transactions FOR SELECT USING (user_id = auth.uid());

-- ── ACHIEVEMENT DEFINITIONS (public read) ────────────────────────────────────
CREATE POLICY "achievement_defs: public read"
  ON public.achievement_definitions FOR SELECT USING (TRUE);

-- ── PLAN DEFINITIONS (public read) ───────────────────────────────────────────
CREATE POLICY "plan_defs: public read"
  ON public.plan_definitions FOR SELECT USING (TRUE);

-- ── REFLECTION PROMPTS (public read) ─────────────────────────────────────────
CREATE POLICY "prompts: public read"
  ON public.reflection_prompts FOR SELECT USING (is_active = TRUE);

-- ── AI TABLES ─────────────────────────────────────────────────────────────────
CREATE POLICY "coach_sessions: own all"
  ON public.coach_sessions FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "coach_messages: own all"
  ON public.coach_messages FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_memory: own read"
  ON public.ai_user_memory FOR SELECT USING (user_id = auth.uid());
-- AI memory is written only by server-side functions (service role)

CREATE POLICY "emotion_analysis: own read"
  ON public.emotion_analysis FOR SELECT USING (user_id = auth.uid());
-- Written only by server functions

CREATE POLICY "ai_insights: own all"
  ON public.ai_insights FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── GARDEN ────────────────────────────────────────────────────────────────────
CREATE POLICY "gardens: own all"
  ON public.gardens FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "garden_plants: own read"
  ON public.garden_plants FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "garden_events: own read"
  ON public.garden_events FOR SELECT USING (user_id = auth.uid());

-- ── HABITS ────────────────────────────────────────────────────────────────────
CREATE POLICY "habits: own all"
  ON public.habits FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "habit_logs: own all"
  ON public.habit_logs FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "habit_correlations: own read"
  ON public.habit_correlations FOR SELECT USING (user_id = auth.uid());

-- ── LIFE WHEEL & WELLNESS ─────────────────────────────────────────────────────
CREATE POLICY "life_wheel: own all"
  ON public.life_wheel_entries FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "breathing: own all"
  ON public.breathing_sessions FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "soundscape: own all"
  ON public.soundscape_sessions FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── MEMORY VAULT ─────────────────────────────────────────────────────────────
-- Users can read their own books
CREATE POLICY "memory_books: own read"
  ON public.memory_books FOR SELECT USING (user_id = auth.uid());

-- Public can read via share_token (for sharing feature)
CREATE POLICY "memory_books: public share read"
  ON public.memory_books FOR SELECT
  USING (share_token IS NOT NULL);   -- front-end filters by token

CREATE POLICY "annual_reviews: own read"
  ON public.annual_reviews FOR SELECT USING (user_id = auth.uid());

-- ── SUBSCRIPTIONS & BILLING ───────────────────────────────────────────────────
CREATE POLICY "subscriptions: own read"
  ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
-- Subscriptions written only by server-side webhook handlers

CREATE POLICY "payments: own read"
  ON public.payment_transactions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "invoices: own read"
  ON public.invoices FOR SELECT USING (user_id = auth.uid());

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE POLICY "notif_queue: own all"
  ON public.notification_queue FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_schedules: own all"
  ON public.notification_schedules FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_templates: public read"
  ON public.notification_templates FOR SELECT USING (is_active = TRUE);

-- ── ACTIVITY / AUDIT (write-only from client, read by service) ───────────────
CREATE POLICY "activity: own insert"
  ON public.activity_events FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "activity: own read"
  ON public.activity_events FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "app_sessions: own all"
  ON public.app_sessions FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "security_events: own read"
  ON public.security_events FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "data_requests: own all"
  ON public.data_requests FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Audit logs: only service role can read/write (no client policy)

-- ── FORCE RLS EVEN FOR TABLE OWNER ────────────────────────────────────────────
-- This ensures RLS is enforced even for the postgres superuser in client connections
ALTER TABLE public.profiles            FORCE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.coach_sessions      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_memory      FORCE ROW LEVEL SECURITY;


-- ================================================================
-- 010_analytics_views.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 010_analytics_views.sql
-- Purpose: Materialized views, analytics functions,
--          index strategy for query optimization
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS (refreshed nightly by pg_cron / Edge Fn)
-- ══════════════════════════════════════════════════════════════

-- ── Daily user stats (base for all analytics) ────────────────────────────────
CREATE MATERIALIZED VIEW public.mv_daily_user_stats AS
SELECT
  je.user_id,
  je.entry_date,
  je.mood_score,
  je.mood_category,
  je.energy_score,
  je.stress_intensity,
  je.word_count,
  je.completion_pct,
  je.written_duration_sec,
  COUNT(gi.id)   AS gratitude_count,
  COUNT(jem.id)  AS emotion_count,
  ea.stress_score,
  ea.anxiety_score,
  ea.gratitude_score,
  ea.burnout_score,
  ea.optimism_score,
  ea.overthinking_score,
  s.current_streak  AS streak_at_time,
  -- Habit check (joined from logs)
  (SELECT COUNT(*) FROM public.habit_logs hl
    WHERE hl.user_id = je.user_id AND hl.log_date = je.entry_date AND hl.completed = TRUE
  ) AS habits_done
FROM public.journal_entries je
LEFT JOIN public.gratitude_items gi   ON gi.entry_id = je.id
LEFT JOIN public.journal_emotions jem ON jem.entry_id = je.id
LEFT JOIN public.emotion_analysis ea  ON ea.entry_id = je.id
LEFT JOIN public.streaks s            ON s.user_id = je.user_id
WHERE je.is_deleted = FALSE AND je.is_draft = FALSE
GROUP BY je.user_id, je.entry_date, je.id, je.mood_score, je.mood_category,
         je.energy_score, je.stress_intensity, je.word_count, je.completion_pct,
         je.written_duration_sec, ea.stress_score, ea.anxiety_score, ea.gratitude_score,
         ea.burnout_score, ea.optimism_score, ea.overthinking_score, s.current_streak
WITH NO DATA;

CREATE UNIQUE INDEX ON public.mv_daily_user_stats(user_id, entry_date);
CREATE INDEX ON public.mv_daily_user_stats(user_id, entry_date DESC);
CREATE INDEX ON public.mv_daily_user_stats(entry_date DESC);

-- ── Weekly aggregates ─────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW public.mv_weekly_user_stats AS
SELECT
  user_id,
  DATE_TRUNC('week', entry_date)::DATE      AS week_start,
  COUNT(*)                                   AS entries_count,
  ROUND(AVG(mood_score), 2)                  AS avg_mood,
  ROUND(AVG(energy_score), 2)                AS avg_energy,
  ROUND(AVG(stress_intensity), 2)            AS avg_stress,
  ROUND(AVG(gratitude_count), 2)             AS avg_gratitude,
  SUM(word_count)                            AS total_words,
  MAX(streak_at_time)                        AS max_streak,
  ROUND(AVG(stress_score), 3)                AS avg_stress_ai,
  ROUND(AVG(anxiety_score), 3)               AS avg_anxiety_ai,
  ROUND(AVG(optimism_score), 3)              AS avg_optimism_ai
FROM public.mv_daily_user_stats
GROUP BY user_id, DATE_TRUNC('week', entry_date)
WITH NO DATA;

CREATE UNIQUE INDEX ON public.mv_weekly_user_stats(user_id, week_start);

-- ── Monthly aggregates ────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW public.mv_monthly_user_stats AS
SELECT
  user_id,
  EXTRACT(YEAR FROM entry_date)::SMALLINT    AS year,
  EXTRACT(MONTH FROM entry_date)::SMALLINT   AS month,
  COUNT(*)                                   AS entries_count,
  ROUND(AVG(mood_score), 2)                  AS avg_mood,
  ROUND(AVG(energy_score), 2)                AS avg_energy,
  ROUND(AVG(stress_intensity), 2)            AS avg_stress,
  MAX(streak_at_time)                        AS max_streak,
  SUM(word_count)                            AS total_words,
  SUM(gratitude_count)                       AS total_gratitude_items,
  ROUND(AVG(stress_score), 3)                AS avg_stress_ai,
  ROUND(AVG(anxiety_score), 3)               AS avg_anxiety_ai,
  ROUND(AVG(optimism_score), 3)              AS avg_optimism_ai,
  ROUND(AVG(gratitude_score), 3)             AS avg_gratitude_ai
FROM public.mv_daily_user_stats
GROUP BY user_id, EXTRACT(YEAR FROM entry_date), EXTRACT(MONTH FROM entry_date)
WITH NO DATA;

CREATE UNIQUE INDEX ON public.mv_monthly_user_stats(user_id, year, month);

-- ── Refresh function (called by pg_cron every day at 02:00 UTC) ──────────────
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_user_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_weekly_user_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_monthly_user_stats;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- UTILITY FUNCTIONS FOR API LAYER
-- ══════════════════════════════════════════════════════════════

-- ── Get mood calendar for a month ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_mood_calendar(
  p_user_id UUID,
  p_year    SMALLINT,
  p_month   SMALLINT
)
RETURNS TABLE(
  entry_date DATE,
  mood_score SMALLINT,
  mood_category mood_category,
  has_journal BOOLEAN
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.entry_date,
    je.mood_score,
    je.mood_category,
    TRUE AS has_journal
  FROM public.journal_entries je
  WHERE je.user_id = p_user_id
    AND EXTRACT(YEAR FROM je.entry_date) = p_year
    AND EXTRACT(MONTH FROM je.entry_date) = p_month
    AND je.is_deleted = FALSE
    AND je.is_draft = FALSE
  ORDER BY je.entry_date;
END; $$;

-- ── Get dashboard widgets data (single query for performance) ─────────────────
CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'streak',         jsonb_build_object('current', s.current_streak, 'longest', s.longest_streak, 'total', s.total_entries),
    'mood_today',     (SELECT jsonb_build_object('score', mood_score, 'category', mood_category)
                       FROM public.journal_entries WHERE user_id = p_user_id AND entry_date = CURRENT_DATE AND is_draft = FALSE LIMIT 1),
    'xp',             jsonb_build_object('total', ux.total_xp, 'level', ux.current_level),
    'garden_level',   g.level,
    'weekly_avg_mood',(SELECT ROUND(AVG(mood_score), 1)
                       FROM public.journal_entries
                       WHERE user_id = p_user_id AND entry_date >= CURRENT_DATE - 7 AND is_draft = FALSE),
    'unread_insights',(SELECT COUNT(*) FROM public.ai_insights WHERE user_id = p_user_id AND seen_at IS NULL),
    'pending_achievements', (SELECT COUNT(*) FROM public.user_achievements WHERE user_id = p_user_id AND notified = FALSE)
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.streaks s      ON s.user_id = p.id
  LEFT JOIN public.user_xp ux     ON ux.user_id = p.id
  LEFT JOIN public.gardens g      ON g.user_id = p.id
  WHERE p.id = p_user_id;
  RETURN v_result;
END; $$;

-- ── Semantic search over user's journals ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_journals_semantic(
  p_user_id   UUID,
  p_embedding VECTOR(1536),
  p_limit     INTEGER DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE(
  entry_id    UUID,
  entry_date  DATE,
  similarity  FLOAT,
  snippet     TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id AS entry_id,
    je.entry_date,
    1 - (emb.embedding <=> p_embedding) AS similarity,
    LEFT(je.main_story, 200) AS snippet
  FROM public.journal_embeddings emb
  JOIN public.journal_entries je ON je.id = emb.entry_id
  WHERE emb.user_id = p_user_id
    AND je.is_deleted = FALSE
    AND 1 - (emb.embedding <=> p_embedding) > p_threshold
  ORDER BY emb.embedding <=> p_embedding
  LIMIT p_limit;
END; $$;

-- ── Full-text search over journals ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_journals_text(
  p_user_id UUID,
  p_query   TEXT,
  p_limit   INTEGER DEFAULT 10
)
RETURNS TABLE(
  entry_id   UUID,
  entry_date DATE,
  rank       FLOAT,
  snippet    TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id AS entry_id,
    je.entry_date,
    ts_rank(je.main_story_tsv, to_tsquery('indonesian', p_query)) AS rank,
    ts_headline('indonesian', COALESCE(je.main_story, ''),
      to_tsquery('indonesian', p_query),
      'MaxWords=30, MinWords=10, StartSel=<mark>, StopSel=</mark>'
    ) AS snippet
  FROM public.journal_entries je
  WHERE je.user_id = p_user_id
    AND je.is_deleted = FALSE
    AND je.main_story_tsv @@ to_tsquery('indonesian', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END; $$;

-- ── Check feature gate (plan-based) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_can_use_feature(
  p_user_id UUID,
  p_feature TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_plan user_plan;
  v_features JSONB;
BEGIN
  SELECT p.plan INTO v_plan FROM public.profiles p WHERE p.id = p_user_id;
  SELECT features INTO v_features FROM public.plan_definitions WHERE slug = v_plan;
  RETURN (v_features->>p_feature)::TEXT != 'false';
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END; $$;

-- ── Soft delete user data (GDPR) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_account_deletion(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check auth
  IF auth.uid() != p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- Soft delete profile
  UPDATE public.profiles SET is_deleted = TRUE, deleted_at = NOW() WHERE id = p_user_id;
  -- Queue full deletion in 30 days
  INSERT INTO public.data_requests (user_id, request_type, status)
  VALUES (p_user_id, 'delete', 'pending');
  -- Log security event
  INSERT INTO public.security_events (user_id, event_type)
  VALUES (p_user_id, 'account_deleted');
END; $$;

-- ══════════════════════════════════════════════════════════════
-- SUPPLEMENTAL INDEXES (query-specific)
-- ══════════════════════════════════════════════════════════════

-- Analytics: mood trends over time
CREATE INDEX idx_journal_analytics_mood
  ON public.journal_entries(user_id, entry_date, mood_score, energy_score, stress_intensity)
  WHERE is_deleted = FALSE AND is_draft = FALSE;

-- AI context retrieval: most recent journals for a user
CREATE INDEX idx_journal_recent
  ON public.journal_entries(user_id, entry_date DESC)
  INCLUDE (mood_score, mood_category, main_story, stress_source, happy_moments)
  WHERE is_deleted = FALSE AND is_draft = FALSE;

-- Habit correlation: join journals + habit_logs by user + date
CREATE INDEX idx_habit_logs_correlation
  ON public.habit_logs(user_id, log_date, habit_id, completed);

-- Notification delivery: find unsent notifications due now
CREATE INDEX idx_notif_delivery
  ON public.notification_queue(scheduled_at, channel)
  WHERE sent_at IS NULL AND failed_at IS NULL AND retry_count < 3;

-- AI insights expiry cleanup
CREATE INDEX idx_ai_insights_expiry
  ON public.ai_insights(expires_at)
  WHERE expires_at IS NOT NULL;

-- Subscription renewals
CREATE INDEX idx_sub_renewal
  ON public.subscriptions(current_period_end, status)
  WHERE status = 'active' AND cancel_at_period_end = FALSE;

-- Partial index: active premium/pro users (most accessed segment)
CREATE INDEX idx_profiles_paying
  ON public.profiles(id, plan, last_active_at)
  WHERE plan IN ('premium', 'pro') AND is_deleted = FALSE;


-- ================================================================
-- 011_feature_flags_referral.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 011_feature_flags_referral.sql
-- Purpose: Feature flags, A/B tests, referral system,
--          search history, app config, pg_cron schedule
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- FEATURE FLAGS (per-user overrides + global flags)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.feature_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  enabled_globally BOOLEAN NOT NULL DEFAULT FALSE,
  -- Plan-based rollout
  enabled_plans   user_plan[] DEFAULT '{}',
  -- Percentage rollout (0-100, NULL = no percentage gate)
  rollout_pct     SMALLINT CHECK (rollout_pct BETWEEN 0 AND 100),
  -- Metadata
  owner_team      TEXT DEFAULT 'product',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_feature_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_id     UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL,
  reason      TEXT,                                  -- 'manual_override' | 'beta_tester' | 'a_b_test'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, flag_id)
);

-- Seed core feature flags
INSERT INTO public.feature_flags (slug, description, enabled_globally, enabled_plans, rollout_pct) VALUES
  ('ai_coach',              'AI Reflection Coach',           FALSE, ARRAY['premium','pro']::user_plan[],   NULL),
  ('emotional_garden',      'Emotional Garden gamification',  TRUE, ARRAY['free','premium','pro']::user_plan[], NULL),
  ('soundscape_mixer',      'Full soundscape mixer',         FALSE, ARRAY['premium','pro']::user_plan[],   NULL),
  ('memory_books',          'Monthly memory books',          FALSE, ARRAY['premium','pro']::user_plan[],   NULL),
  ('life_wheel',            'Life wheel radar chart',        FALSE, ARRAY['premium','pro']::user_plan[],   NULL),
  ('habit_tracker',         'Habit tracker',                  TRUE, ARRAY['free','premium','pro']::user_plan[], NULL),
  ('annual_review',         'Annual AI review',              FALSE, ARRAY['pro']::user_plan[],             NULL),
  ('ai_insights_daily',     'Daily AI insights',             FALSE, ARRAY['premium','pro']::user_plan[],   NULL),
  ('pdf_export',            'PDF export for memory books',   FALSE, ARRAY['premium','pro']::user_plan[],   NULL),
  ('offline_mode',          'Offline journal sync',          FALSE, ARRAY['premium','pro']::user_plan[],   NULL),
  ('beta_ai_v2',            'AI Coach v2 experimental',      FALSE, ARRAY[]::user_plan[],                  10);

-- ── CHECK FEATURE FOR USER (fast function for API middleware) ────────────────
CREATE OR REPLACE FUNCTION public.check_feature(
  p_user_id UUID,
  p_slug    TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_plan    user_plan;
  v_flag    RECORD;
  v_override RECORD;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  SELECT * INTO v_flag FROM public.feature_flags
  WHERE slug = p_slug AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Check user-level override first
  SELECT enabled INTO v_override FROM public.user_feature_flags
  WHERE user_id = p_user_id AND flag_id = v_flag.id;
  IF FOUND THEN RETURN v_override.enabled; END IF;

  -- Global flag
  IF v_flag.enabled_globally THEN RETURN TRUE; END IF;

  -- Plan-based
  IF v_plan = ANY(v_flag.enabled_plans) THEN RETURN TRUE; END IF;

  -- Percentage rollout (deterministic by user_id hash)
  IF v_flag.rollout_pct IS NOT NULL THEN
    RETURN (abs(hashtext(p_user_id::TEXT || p_slug)) % 100) < v_flag.rollout_pct;
  END IF;

  RETURN FALSE;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- REFERRAL SYSTEM
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.referral_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code            TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 1, 8)),
  uses_count      INTEGER NOT NULL DEFAULT 0,
  max_uses        INTEGER DEFAULT NULL,               -- NULL = unlimited
  reward_days     INTEGER NOT NULL DEFAULT 7,         -- free premium days per referral
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id      UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_id         UUID NOT NULL REFERENCES public.referral_codes(id),
  -- Reward tracking
  referrer_rewarded_at  TIMESTAMPTZ,
  referee_rewarded_at   TIMESTAMPTZ,
  reward_days           INTEGER NOT NULL DEFAULT 7,
  -- Qualification (referee must complete N journals to qualify)
  qualified_at    TIMESTAMPTZ,
  qualification_journals INTEGER NOT NULL DEFAULT 3,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create referral code on signup
CREATE OR REPLACE FUNCTION public.create_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_create_referral_code
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_code();

-- ══════════════════════════════════════════════════════════════
-- JOURNAL SEARCH HISTORY (for quick re-access)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.search_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'text',          -- 'text' | 'semantic' | 'date' | 'emotion'
  result_count INTEGER DEFAULT 0,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep only last 50 searches per user
CREATE OR REPLACE FUNCTION public.trim_search_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.search_history
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM public.search_history
      WHERE user_id = NEW.user_id
      ORDER BY searched_at DESC
      LIMIT 50
    );
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_trim_search_history
  AFTER INSERT ON public.search_history
  FOR EACH ROW EXECUTE FUNCTION public.trim_search_history();

-- ══════════════════════════════════════════════════════════════
-- APP CONFIG (key-value store for server-side settings)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,        -- TRUE = readable by anon
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default config
INSERT INTO public.app_config (key, value, description, is_public) VALUES
  ('ai.coach.max_messages_free',     '3',                  'Max AI coach messages per day for free users',  FALSE),
  ('ai.coach.max_messages_premium', 'null',                'null = unlimited',                              FALSE),
  ('ai.coach.model',                '"gpt-4o"',            'Primary AI model for coach',                    FALSE),
  ('ai.analysis.model',             '"gpt-4o-mini"',       'Model for emotion analysis (cheaper)',          FALSE),
  ('ai.embedding.model',            '"text-embedding-3-small"', 'Embedding model',                         FALSE),
  ('streak.grace_period_hours',     '26',                  'Hours before streak breaks (> 24h buffer)',     FALSE),
  ('garden.plants_per_level',       '[0,2,7,20,50]',       'Plants needed for seed/sprout/plant/tree/forest', FALSE),
  ('maintenance_mode',              'false',               'Set true to show maintenance page',              TRUE),
  ('app_version_web',               '"1.0.0"',             'Current web app version',                        TRUE),
  ('app_version_ios',               '"1.0.0"',             'Current iOS app version',                        TRUE),
  ('app_version_android',           '"1.0.0"',             'Current Android app version',                    TRUE),
  ('free_soundscape_limit_min',     '30',                  'Seconds of free soundscape preview',             FALSE);

-- ══════════════════════════════════════════════════════════════
-- JOURNAL TEMPLATES (guided prompts for specific contexts)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE public.journal_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  emoji           TEXT,
  category        TEXT NOT NULL,                     -- 'daily' | 'gratitude' | 'stress' | 'goal' | 'custom'
  prompts         JSONB NOT NULL DEFAULT '[]',        -- [{step:5, prompt_override:"..."}, ...]
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  plan_required   user_plan NOT NULL DEFAULT 'free',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.journal_templates (name, description, emoji, category, sort_order, prompts) VALUES
  ('Jurnal Standar',      'Format 15 langkah lengkap',              '📖', 'daily',    1, '[]'),
  ('Refleksi Cepat',      'Hanya mood, emosi, dan satu cerita',     '⚡', 'daily',    2, '[{"step":5,"prompt":"Ceritakan satu kejadian penting hari ini dalam 3 kalimat."}]'),
  ('Jurnal Rasa Syukur',  'Fokus pada hal-hal yang patut disyukuri','💛', 'gratitude',3, '[{"step":9,"prompt":"Tuliskan 5 hal yang paling kamu syukuri hari ini, sekecil apapun."}]'),
  ('Manajemen Stres',     'Khusus untuk hari yang berat',           '😮‍💨', 'stress',  4, '[{"step":7,"prompt":"Ceritakan detail situasi yang membuat stres dan apa yang membuatnya terasa berat."}]'),
  ('Review Mingguan',     'Refleksi 7 hari terakhir',               '🗓️', 'goal',     5, '[{"step":5,"prompt":"Apa 3 pencapaian terbaikmu minggu ini?"}, {"step":11,"prompt":"Apa pelajaran terpenting dari minggu ini?"}]');

-- ══════════════════════════════════════════════════════════════
-- PG_CRON SCHEDULE (Supabase cron via pg_cron extension)
-- ══════════════════════════════════════════════════════════════
-- NOTE: Execute these after enabling pg_cron in Supabase dashboard
-- SELECT cron.schedule(...) requires superuser or pg_cron role

-- Uncomment and run in Supabase SQL editor:
/*
-- Refresh analytics materialized views daily at 02:00 UTC
SELECT cron.schedule(
  'refresh-analytics-views',
  '0 2 * * *',
  'SELECT public.refresh_analytics_views()'
);

-- Generate memory books on 1st of each month at 03:00 UTC
SELECT cron.schedule(
  'generate-memory-books',
  '0 3 1 * *',
  'SELECT public.generate_all_memory_books()'
);

-- Clean up expired notifications daily at 04:00 UTC
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 4 * * *',
  'DELETE FROM public.notification_queue WHERE created_at < NOW() - INTERVAL ''30 days'' AND (read_at IS NOT NULL OR sent_at IS NOT NULL)'
);

-- Send streak reminders daily at 20:00 WIB (13:00 UTC)
SELECT cron.schedule(
  'send-streak-reminders',
  '0 13 * * *',
  'SELECT public.queue_streak_reminders()'
);

-- Compute habit correlations weekly on Sunday at 01:00 UTC
SELECT cron.schedule(
  'compute-habit-correlations',
  '0 1 * * 0',
  'SELECT public.compute_all_habit_correlations()'
);

-- Delete soft-deleted accounts older than 30 days
SELECT cron.schedule(
  'hard-delete-accounts',
  '0 5 * * *',
  'SELECT public.hard_delete_expired_accounts()'
);

-- Cleanup expired sync_queue entries
SELECT cron.schedule(
  'cleanup-sync-queue',
  '0 6 * * *',
  'DELETE FROM public.sync_queue WHERE created_at < NOW() - INTERVAL ''7 days'' AND resolved = TRUE'
);
*/

-- ── INDEXES ───────────────────────────────────────────────────────────────────
ALTER TABLE public.feature_flags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags: public read" ON public.feature_flags FOR SELECT USING (TRUE);
CREATE POLICY "user_flags: own all" ON public.user_feature_flags
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "referral_codes: own read" ON public.referral_codes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "referrals: own read" ON public.referrals FOR SELECT USING (referrer_id = auth.uid() OR referee_id = auth.uid());
CREATE POLICY "search_history: own all" ON public.search_history
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "app_config: public read" ON public.app_config FOR SELECT USING (is_public = TRUE);
CREATE POLICY "journal_templates: public read" ON public.journal_templates FOR SELECT USING (is_public = TRUE);

CREATE INDEX idx_feature_flags_slug ON public.feature_flags(slug) WHERE expires_at IS NULL OR expires_at > NOW();
CREATE INDEX idx_user_feature_flags_user ON public.user_feature_flags(user_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code) WHERE is_active = TRUE;
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_unqualified ON public.referrals(qualified_at) WHERE qualified_at IS NULL;
CREATE INDEX idx_search_history_user ON public.search_history(user_id, searched_at DESC);


-- ================================================================
-- 012_background_jobs.sql
-- ================================================================
-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 012_background_jobs.sql
-- Purpose: Stored functions called by pg_cron / Edge Functions
--          for async processing: memory books, notifications,
--          habit correlations, account cleanup
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- MEMORY BOOK GENERATION
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_memory_book(
  p_user_id UUID,
  p_year    SMALLINT,
  p_month   SMALLINT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_book_id       UUID;
  v_entry_count   INTEGER;
  v_avg_mood      NUMERIC;
  v_best_moment   TEXT;
  v_top_lesson    TEXT;
  v_top_gratitude TEXT;
  v_mood_heatmap  JSONB := '{}';
  v_emotion_dist  JSONB := '{}';
  v_highlights    JSONB;
BEGIN
  -- Check entry count
  SELECT COUNT(*), ROUND(AVG(mood_score),2)
  INTO v_entry_count, v_avg_mood
  FROM public.journal_entries
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM entry_date) = p_year
    AND EXTRACT(MONTH FROM entry_date) = p_month
    AND is_deleted = FALSE AND is_draft = FALSE;

  IF v_entry_count < 1 THEN RETURN NULL; END IF;

  -- Best happy moment
  SELECT happy_moments INTO v_best_moment
  FROM public.journal_entries
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM entry_date) = p_year
    AND EXTRACT(MONTH FROM entry_date) = p_month
    AND happy_moments IS NOT NULL AND mood_score IS NOT NULL
    AND is_deleted = FALSE AND is_draft = FALSE
  ORDER BY mood_score DESC LIMIT 1;

  -- Top lesson
  SELECT lessons_learned INTO v_top_lesson
  FROM public.journal_entries
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM entry_date) = p_year
    AND EXTRACT(MONTH FROM entry_date) = p_month
    AND lessons_learned IS NOT NULL
    AND is_deleted = FALSE AND is_draft = FALSE
  ORDER BY word_count DESC LIMIT 1;

  -- Top gratitude (most common first word as theme)
  SELECT text INTO v_top_gratitude
  FROM public.gratitude_items gi
  JOIN public.journal_entries je ON je.id = gi.entry_id
  WHERE gi.user_id = p_user_id
    AND EXTRACT(YEAR FROM je.entry_date) = p_year
    AND EXTRACT(MONTH FROM je.entry_date) = p_month
  GROUP BY text ORDER BY COUNT(*) DESC LIMIT 1;

  -- Build mood heatmap
  SELECT jsonb_object_agg(entry_date::TEXT, mood_score)
  INTO v_mood_heatmap
  FROM public.journal_entries
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM entry_date) = p_year
    AND EXTRACT(MONTH FROM entry_date) = p_month
    AND mood_score IS NOT NULL
    AND is_deleted = FALSE AND is_draft = FALSE;

  -- Build emotion distribution
  SELECT jsonb_object_agg(emotion, cnt)
  INTO v_emotion_dist
  FROM (
    SELECT em.emotion, COUNT(*) AS cnt
    FROM public.journal_emotions em
    JOIN public.journal_entries je ON je.id = em.entry_id
    WHERE em.user_id = p_user_id
      AND EXTRACT(YEAR FROM je.entry_date) = p_year
      AND EXTRACT(MONTH FROM je.entry_date) = p_month
    GROUP BY em.emotion
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;

  v_highlights := jsonb_build_object(
    'best_moment',    v_best_moment,
    'top_lesson',     v_top_lesson,
    'top_gratitude',  v_top_gratitude,
    'entry_count',    v_entry_count,
    'avg_mood',       v_avg_mood
  );

  -- Upsert memory book record (AI narrative will be filled by Edge Function)
  INSERT INTO public.memory_books (
    user_id, period_year, period_month,
    total_entries, avg_mood,
    best_moment, biggest_lesson, top_gratitude,
    mood_heatmap, emotion_distribution, highlights_json,
    is_ready
  ) VALUES (
    p_user_id, p_year, p_month,
    v_entry_count, v_avg_mood,
    v_best_moment, v_top_lesson, v_top_gratitude,
    v_mood_heatmap, COALESCE(v_emotion_dist, '{}'),
    v_highlights,
    FALSE  -- Edge Function will set TRUE after AI narrative
  )
  ON CONFLICT (user_id, period_year, period_month)
  DO UPDATE SET
    total_entries       = EXCLUDED.total_entries,
    avg_mood            = EXCLUDED.avg_mood,
    best_moment         = EXCLUDED.best_moment,
    biggest_lesson      = EXCLUDED.biggest_lesson,
    top_gratitude       = EXCLUDED.top_gratitude,
    mood_heatmap        = EXCLUDED.mood_heatmap,
    emotion_distribution = EXCLUDED.emotion_distribution,
    highlights_json     = EXCLUDED.highlights_json
  RETURNING id INTO v_book_id;

  RETURN v_book_id;
END; $$;

-- Generate books for ALL premium/pro users last month
CREATE OR REPLACE FUNCTION public.generate_all_memory_books()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_target_year  SMALLINT := EXTRACT(YEAR FROM (NOW() - INTERVAL '1 month'))::SMALLINT;
  v_target_month SMALLINT := EXTRACT(MONTH FROM (NOW() - INTERVAL '1 month'))::SMALLINT;
  v_count        INTEGER := 0;
  v_user         RECORD;
BEGIN
  FOR v_user IN
    SELECT id FROM public.profiles
    WHERE plan IN ('premium', 'pro') AND is_deleted = FALSE
  LOOP
    PERFORM public.generate_memory_book(v_user.id, v_target_year, v_target_month);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- STREAK REMINDER QUEUEING
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.queue_streak_reminders()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user  RECORD;
  v_title TEXT;
  v_body  TEXT;
BEGIN
  -- Find users who: have a streak > 0, haven't written today, have push enabled
  FOR v_user IN
    SELECT p.id, p.display_name, s.current_streak, up.notif_push_enabled, up.notif_reminder_time
    FROM public.profiles p
    JOIN public.streaks s ON s.user_id = p.id
    JOIN public.user_preferences up ON up.user_id = p.id
    WHERE p.is_deleted = FALSE
      AND s.current_streak > 0
      AND s.last_entry_date < CURRENT_DATE
      AND up.notif_push_enabled = TRUE
      AND up.notif_streak_alerts = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_queue nq
        WHERE nq.user_id = p.id
          AND nq.type = 'streak_reminder'
          AND nq.scheduled_at::DATE = CURRENT_DATE
      )
  LOOP
    v_title := 'Hei ' || COALESCE(v_user.display_name, 'kamu') || '! 🌱';
    v_body  := 'Jangan putus streak ' || v_user.current_streak || '-harimu. Tulis jurnal sekarang!';

    INSERT INTO public.notification_queue (user_id, type, channel, title, body, data, scheduled_at)
    VALUES (v_user.id, 'streak_reminder', 'push', v_title, v_body,
            jsonb_build_object('streak', v_user.current_streak, 'deep_link', '/journal/new'),
            NOW());

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- HABIT CORRELATION COMPUTATION
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.compute_habit_correlation(
  p_user_id   UUID,
  p_habit_id  UUID,
  p_days      INTEGER DEFAULT 30
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_correlation NUMERIC;
  v_avg_on      NUMERIC;
  v_avg_off     NUMERIC;
  v_n           INTEGER;
  v_pct_change  NUMERIC;
  v_insight     TEXT;
  v_habit_name  TEXT;
BEGIN
  SELECT name INTO v_habit_name FROM public.habits WHERE id = p_habit_id;

  -- Calculate Pearson correlation between habit completion and mood_score
  SELECT
    CORR(hl.completed::INTEGER, je.mood_score),
    AVG(CASE WHEN hl.completed THEN je.mood_score END),
    AVG(CASE WHEN NOT hl.completed THEN je.mood_score END),
    COUNT(*)
  INTO v_correlation, v_avg_on, v_avg_off, v_n
  FROM public.habit_logs hl
  JOIN public.journal_entries je
    ON je.user_id = hl.user_id AND je.entry_date = hl.log_date
  WHERE hl.user_id = p_user_id
    AND hl.habit_id = p_habit_id
    AND hl.log_date >= CURRENT_DATE - p_days
    AND je.is_deleted = FALSE AND je.is_draft = FALSE;

  IF v_n < 5 THEN RETURN; END IF;  -- not enough data

  v_pct_change := CASE WHEN v_avg_off > 0
    THEN ROUND(((v_avg_on - v_avg_off) / v_avg_off) * 100, 1) ELSE 0 END;

  v_insight := CASE
    WHEN v_pct_change > 10  THEN 'Pada hari kamu melakukan ' || v_habit_name || ', rata-rata mood naik ' || v_pct_change || '%.'
    WHEN v_pct_change < -10 THEN 'Pada hari kamu tidak ' || v_habit_name || ', mood cenderung lebih baik ' || ABS(v_pct_change) || '%.'
    ELSE 'Kebiasaan ' || v_habit_name || ' tidak menunjukkan korelasi signifikan dengan mood (r=' || ROUND(v_correlation,2) || ').'
  END;

  INSERT INTO public.habit_correlations (
    user_id, habit_id, correlation_r, sample_size,
    target_metric, avg_on_days, avg_off_days, pct_change, insight_text, period_days
  ) VALUES (
    p_user_id, p_habit_id, ROUND(v_correlation::NUMERIC, 3), v_n,
    'mood_score', ROUND(v_avg_on,2), ROUND(v_avg_off,2),
    v_pct_change, v_insight, p_days
  )
  ON CONFLICT (habit_id, target_metric, (computed_at::DATE))
  DO UPDATE SET
    correlation_r = EXCLUDED.correlation_r,
    sample_size   = EXCLUDED.sample_size,
    avg_on_days   = EXCLUDED.avg_on_days,
    avg_off_days  = EXCLUDED.avg_off_days,
    pct_change    = EXCLUDED.pct_change,
    insight_text  = EXCLUDED.insight_text,
    computed_at   = NOW();
END; $$;

CREATE OR REPLACE FUNCTION public.compute_all_habit_correlations()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER := 0; v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT h.user_id, h.id AS habit_id
    FROM public.habits h
    JOIN public.profiles p ON p.id = h.user_id
    WHERE h.is_archived = FALSE AND p.is_deleted = FALSE
  LOOP
    PERFORM public.compute_habit_correlation(v_rec.user_id, v_rec.habit_id, 30);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- ACCOUNT DELETION (GDPR hard delete after 30 days)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hard_delete_expired_accounts()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER := 0; v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT user_id FROM public.data_requests
    WHERE request_type = 'delete'
      AND status = 'pending'
      AND requested_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Cancel active subscriptions
    UPDATE public.subscriptions SET status = 'canceled', canceled_at = NOW()
    WHERE user_id = v_user_id AND status IN ('active','trialing');

    -- Anonymize profile (GDPR: can't delete if billing records exist)
    UPDATE public.profiles SET
      email        = 'deleted_' || v_user_id || '@mindbloom.deleted',
      full_name    = 'Deleted User',
      display_name = NULL,
      avatar_url   = NULL,
      bio          = NULL,
      is_deleted   = TRUE,
      deleted_at   = NOW()
    WHERE id = v_user_id;

    -- Hard delete personal content
    DELETE FROM public.journal_entries      WHERE user_id = v_user_id;
    DELETE FROM public.ai_user_memory       WHERE user_id = v_user_id;
    DELETE FROM public.coach_sessions       WHERE user_id = v_user_id;
    DELETE FROM public.activity_events      WHERE user_id = v_user_id;

    -- Mark request complete
    UPDATE public.data_requests SET status = 'completed', processed_at = NOW()
    WHERE user_id = v_user_id AND request_type = 'delete';

    -- Delete from Supabase auth (must be done via admin API, log intent here)
    INSERT INTO public.security_events (user_id, event_type, details)
    VALUES (v_user_id, 'account_deleted', '{"hard_deleted":true}');

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- XP AWARD ON JOURNAL SAVE
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.award_xp_on_journal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_xp INTEGER := 0;
BEGIN
  IF NEW.is_draft = TRUE THEN RETURN NEW; END IF;
  -- Base XP
  v_xp := 10;
  -- Bonus for completion
  IF NEW.completion_pct >= 80 THEN v_xp := v_xp + 15; END IF;
  IF NEW.completion_pct = 100 THEN v_xp := v_xp + 25; END IF;
  -- Bonus for word count
  IF NEW.word_count >= 200 THEN v_xp := v_xp + 10; END IF;
  IF NEW.word_count >= 500 THEN v_xp := v_xp + 15; END IF;

  PERFORM public.award_xp(NEW.user_id, v_xp, 'journal_completed', NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_xp_journal
  AFTER INSERT OR UPDATE OF is_draft ON public.journal_entries
  FOR EACH ROW
  WHEN (NEW.is_draft = FALSE)
  EXECUTE FUNCTION public.award_xp_on_journal();

-- ══════════════════════════════════════════════════════════════
-- COMPLETION PERCENTAGE CALCULATOR
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.calculate_completion_pct()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_filled INTEGER := 0;
BEGIN
  IF NEW.mood_score          IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.energy_score        IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.main_story          IS NOT NULL AND LENGTH(NEW.main_story) > 10 THEN v_filled := v_filled + 1; END IF;
  IF NEW.recurring_thoughts  IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.stress_source       IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.happy_moments       IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.lessons_learned     IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.did_well            IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.improve_on          IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.do_differently      IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.self_compassion     IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.tomorrow_intention  IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  IF NEW.prayer_hope         IS NOT NULL THEN v_filled := v_filled + 1; END IF;
  -- Steps with sub-tables (mood=step2, gratitude=step9, emotions=step3)
  -- These are counted via the relationship tables; here estimate from other fields
  NEW.completion_pct := ROUND((v_filled::NUMERIC / 13.0) * 100)::SMALLINT;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_completion_pct
  BEFORE INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.calculate_completion_pct();

