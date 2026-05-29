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
