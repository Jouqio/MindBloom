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
