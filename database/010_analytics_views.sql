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
