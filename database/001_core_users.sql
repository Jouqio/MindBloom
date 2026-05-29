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
