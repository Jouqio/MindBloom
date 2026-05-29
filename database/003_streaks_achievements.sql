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
