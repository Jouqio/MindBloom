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
