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
