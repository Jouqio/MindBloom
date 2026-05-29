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
