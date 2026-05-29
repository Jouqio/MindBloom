-- ============================================================
-- MindBloom Database Schema — Production Ready
-- File: 007_subscriptions_billing.sql
-- Purpose: Plans, subscriptions, payments, invoices, coupons
-- ============================================================

-- ── PLAN DEFINITIONS ─────────────────────────────────────────────────────────
CREATE TABLE public.plan_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            user_plan NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  price_monthly   INTEGER NOT NULL DEFAULT 0,         -- IDR, 0 = free
  price_yearly    INTEGER NOT NULL DEFAULT 0,
  price_lifetime  INTEGER NOT NULL DEFAULT 0,
  features        JSONB NOT NULL DEFAULT '{}',
    -- { ai_coach_limit: null, soundscapes: 6, analytics_days: 90, ... }
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plan_definitions (slug, name, price_monthly, price_yearly, price_lifetime, features, sort_order) VALUES
  ('free',    'Gratis',   0,        0,          0,           '{"ai_coach_limit":3,"soundscapes":1,"analytics_days":7,"garden_full":false,"memory_book":false,"export_pdf":false}', 1),
  ('premium', 'Premium',  49000,    470000,     990000,      '{"ai_coach_limit":null,"soundscapes":6,"analytics_days":90,"garden_full":true,"memory_book":true,"export_pdf":true}',  2),
  ('pro',     'Pro',      99000,    950000,     1990000,     '{"ai_coach_limit":null,"soundscapes":6,"analytics_days":999,"garden_full":true,"memory_book":true,"export_pdf":true,"api_access":true,"custom_prompts":true}', 3);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan                user_plan NOT NULL DEFAULT 'free',
  status              subscription_status NOT NULL DEFAULT 'active',
  billing_interval    billing_interval,
  -- Dates
  trial_started_at    TIMESTAMPTZ,
  trial_ends_at       TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end  TIMESTAMPTZ,
  canceled_at         TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  -- Payment processor references
  midtrans_customer_id TEXT,
  midtrans_sub_id     TEXT UNIQUE,
  -- Metadata
  source              TEXT DEFAULT 'web',            -- 'web' | 'ios' | 'android'
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active subscription per user
CREATE UNIQUE INDEX idx_subscriptions_active_user
  ON public.subscriptions(user_id)
  WHERE status IN ('active', 'trialing');

-- ── SYNC SUBSCRIPTION TO PROFILE ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_plan_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('active', 'trialing') THEN
    UPDATE public.profiles SET plan = NEW.plan, updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSIF NEW.status IN ('canceled', 'expired', 'past_due') THEN
    -- Check if any other active sub exists
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = NEW.user_id AND status IN ('active','trialing') AND id != NEW.id
    ) THEN
      UPDATE public.profiles SET plan = 'free', updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_plan
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_plan_to_profile();

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── PAYMENT TRANSACTIONS ──────────────────────────────────────────────────────
CREATE TABLE public.payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES public.subscriptions(id),
  -- Amount
  amount              INTEGER NOT NULL,               -- IDR
  currency            TEXT NOT NULL DEFAULT 'IDR',
  -- Midtrans fields
  midtrans_order_id   TEXT NOT NULL UNIQUE,
  midtrans_txn_id     TEXT,
  payment_type        TEXT,                           -- 'credit_card' | 'gopay' | 'bank_transfer'
  va_number           TEXT,
  -- Status
  status              payment_status NOT NULL DEFAULT 'pending',
  paid_at             TIMESTAMPTZ,
  expired_at          TIMESTAMPTZ,
  failed_reason       TEXT,
  -- Refund
  refunded_at         TIMESTAMPTZ,
  refund_amount       INTEGER,
  -- Raw webhook
  gateway_payload     JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVOICES ─────────────────────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  transaction_id  UUID REFERENCES public.payment_transactions(id),
  invoice_number  TEXT NOT NULL UNIQUE DEFAULT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 6)),
  amount          INTEGER NOT NULL,
  tax_amount      INTEGER NOT NULL DEFAULT 0,
  total_amount    INTEGER NOT NULL,
  plan_snapshot   JSONB,                             -- plan details at time of purchase
  period_start    DATE,
  period_end      DATE,
  status          TEXT NOT NULL DEFAULT 'draft',     -- 'draft' | 'sent' | 'paid' | 'void'
  pdf_url         TEXT,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DISCOUNT COUPONS ─────────────────────────────────────────────────────────
CREATE TABLE public.coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT NOT NULL,                     -- 'percent' | 'fixed'
  discount_value  INTEGER NOT NULL,
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  applicable_plan user_plan,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.coupon_redemptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id       UUID NOT NULL REFERENCES public.coupons(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id  UUID REFERENCES public.payment_transactions(id),
  discount_applied INTEGER NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_expiring ON public.subscriptions(current_period_end)
  WHERE status = 'active';
CREATE INDEX idx_payments_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX idx_payments_midtrans ON public.payment_transactions(midtrans_order_id);
CREATE INDEX idx_payments_status ON public.payment_transactions(status) WHERE status = 'pending';
CREATE INDEX idx_invoices_user ON public.invoices(user_id, created_at DESC);
CREATE INDEX idx_coupons_code ON public.coupons(code) WHERE is_active = TRUE;
