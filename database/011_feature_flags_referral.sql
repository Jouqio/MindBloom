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
