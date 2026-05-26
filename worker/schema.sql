-- Smart Selenium — license database schema (Cloudflare D1 / SQLite)
-- Polar.sh as the payment + license-key provider.
--
-- Apply:
--   wrangler d1 create smart_selenium_licenses
--   wrangler d1 execute smart_selenium_licenses --remote --file=worker/schema.sql
--
-- Reset for dev (DESTROYS DATA):
--   wrangler d1 execute smart_selenium_licenses --remote --command="DROP TABLE IF EXISTS licenses;"
--   wrangler d1 execute smart_selenium_licenses --remote --file=worker/schema.sql

CREATE TABLE IF NOT EXISTS licenses (
  key                    TEXT    PRIMARY KEY,
  email                  TEXT    NOT NULL,
  tier                   TEXT    NOT NULL CHECK (tier IN ('pro', 'team', 'enterprise')),
  status                 TEXT    NOT NULL CHECK (status IN ('active', 'cancelled', 'refunded', 'expired')),
  expires_at             INTEGER,             -- unix epoch ms; NULL = lifetime
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL,
  last_validated         INTEGER,
  validations_count      INTEGER NOT NULL DEFAULT 0,

  -- Polar.sh references
  polar_order_id         TEXT,
  polar_customer_id      TEXT,
  polar_subscription_id  TEXT,
  polar_license_key_id   TEXT
);

CREATE INDEX IF NOT EXISTS idx_licenses_email                  ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_status                 ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_polar_order_id         ON licenses(polar_order_id);
CREATE INDEX IF NOT EXISTS idx_licenses_polar_subscription_id  ON licenses(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_licenses_polar_license_key_id   ON licenses(polar_license_key_id);
