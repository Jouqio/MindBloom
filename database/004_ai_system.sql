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
