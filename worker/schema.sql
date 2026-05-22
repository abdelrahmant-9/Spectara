-- Smart Selenium — license database schema (Cloudflare D1 / SQLite)
--
-- Apply:
--   wrangler d1 create smart_selenium_licenses
--   wrangler d1 execute smart_selenium_licenses --file=worker/schema.sql
--
-- Reset for dev (DESTROYS DATA):
--   wrangler d1 execute smart_selenium_licenses --command="DROP TABLE IF EXISTS licenses;"
--   wrangler d1 execute smart_selenium_licenses --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS licenses (
  key                 TEXT    PRIMARY KEY,
  email               TEXT    NOT NULL,
  tier                TEXT    NOT NULL CHECK (tier IN ('pro', 'team', 'enterprise')),
  status              TEXT    NOT NULL CHECK (status IN ('active', 'cancelled', 'refunded', 'expired')),
  expires_at          INTEGER,             -- unix epoch ms; NULL = lifetime
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  last_validated      INTEGER,
  validations_count   INTEGER NOT NULL DEFAULT 0,

  -- LemonSqueezy references (one or both populated depending on product type)
  ls_order_id         TEXT,
  ls_customer_id      TEXT,
  ls_subscription_id  TEXT
);

CREATE INDEX IF NOT EXISTS idx_licenses_email             ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_status            ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_ls_order_id       ON licenses(ls_order_id);
CREATE INDEX IF NOT EXISTS idx_licenses_ls_subscription_id ON licenses(ls_subscription_id);
