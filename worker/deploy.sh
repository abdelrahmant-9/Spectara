#!/usr/bin/env bash
#
# deploy.sh — one-shot Cloudflare Worker + D1 deploy for the Smart Selenium
# license backend. Idempotent: safe to re-run.
#
# Usage:
#   cd worker/
#   bash deploy.sh
#
# Prerequisites:
#   - Node.js + npm installed
#   - Cloudflare account (free tier is fine)
#   - LemonSqueezy product with a Webhook secret ready to paste

set -euo pipefail

WORKER_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$WORKER_DIR"

DB_NAME="smart_selenium_licenses"
WRANGLER_TOML="wrangler.toml"
SCHEMA_FILE="schema.sql"

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
say() { printf "\n\033[1;32m▸ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*" >&2; }
die() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }
ask() { printf "\033[1;36m? %s\033[0m " "$*"; }

# ──────────────────────────────────────────────────────────────
# 1. Install wrangler if missing
# ──────────────────────────────────────────────────────────────
if ! command -v wrangler >/dev/null 2>&1; then
  say "wrangler not found — installing globally via npm"
  npm i -g wrangler || die "wrangler install failed. Try: sudo npm i -g wrangler"
fi
say "wrangler $(wrangler --version 2>&1 | head -1)"

# ──────────────────────────────────────────────────────────────
# 2. Cloudflare auth
# ──────────────────────────────────────────────────────────────
if ! wrangler whoami >/dev/null 2>&1; then
  say "Logging into Cloudflare (opens browser)"
  wrangler login || die "Login failed"
fi
say "logged in as: $(wrangler whoami 2>&1 | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | head -1 || echo unknown)"

# ──────────────────────────────────────────────────────────────
# 3. Create D1 database (idempotent)
# ──────────────────────────────────────────────────────────────
EXISTING_ID="$(grep -E '^database_id\s*=' "$WRANGLER_TOML" | sed -E 's/.*"([^"]+)".*/\1/' | head -1 || true)"

if [[ "$EXISTING_ID" == "REPLACE_WITH_DATABASE_ID_FROM_wrangler_d1_create" || -z "$EXISTING_ID" ]]; then
  say "Creating D1 database '$DB_NAME'"
  CREATE_OUTPUT="$(wrangler d1 create "$DB_NAME" 2>&1 || true)"
  echo "$CREATE_OUTPUT"

  # Extract database_id from output (matches "database_id = \"...\"" or "id: ...")
  NEW_ID="$(echo "$CREATE_OUTPUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1 || true)"

  if [[ -z "$NEW_ID" ]]; then
    # DB may already exist — query it
    say "Database may already exist — looking up id"
    LIST_OUTPUT="$(wrangler d1 list 2>&1 || true)"
    NEW_ID="$(echo "$LIST_OUTPUT" | awk -v name="$DB_NAME" '$0 ~ name {for(i=1;i<=NF;i++){if($i~/^[0-9a-f]{8}-/){print $i; exit}}}' | head -1)"
  fi

  [[ -n "$NEW_ID" ]] || die "Could not determine database_id. Run: wrangler d1 list"

  say "Database id: $NEW_ID"
  # Write database_id into wrangler.toml (BSD sed-compatible for macOS)
  if sed --version >/dev/null 2>&1; then
    sed -i "s|database_id   = \"REPLACE_WITH_DATABASE_ID_FROM_wrangler_d1_create\"|database_id   = \"$NEW_ID\"|" "$WRANGLER_TOML"
  else
    sed -i "" "s|database_id   = \"REPLACE_WITH_DATABASE_ID_FROM_wrangler_d1_create\"|database_id   = \"$NEW_ID\"|" "$WRANGLER_TOML"
  fi
  say "wrangler.toml updated"
else
  say "database_id already set: $EXISTING_ID"
fi

# ──────────────────────────────────────────────────────────────
# 4. Apply schema (idempotent — CREATE TABLE IF NOT EXISTS)
# ──────────────────────────────────────────────────────────────
say "Applying schema from $SCHEMA_FILE"
wrangler d1 execute "$DB_NAME" --remote --file="$SCHEMA_FILE" || die "Schema apply failed"

# ──────────────────────────────────────────────────────────────
# 5. LemonSqueezy webhook secret
# ──────────────────────────────────────────────────────────────
EXISTING_SECRETS="$(wrangler secret list 2>/dev/null || echo "")"
if echo "$EXISTING_SECRETS" | grep -q "LS_WEBHOOK_SECRET"; then
  say "LS_WEBHOOK_SECRET already set — skipping (delete with 'wrangler secret delete LS_WEBHOOK_SECRET' to rotate)"
else
  say "Setting LS_WEBHOOK_SECRET"
  echo
  ask "Paste LemonSqueezy webhook signing secret (find in LS dashboard → Settings → Webhooks → your endpoint):"
  echo
  wrangler secret put LS_WEBHOOK_SECRET || die "Secret put failed"
fi

# ──────────────────────────────────────────────────────────────
# 6. Deploy
# ──────────────────────────────────────────────────────────────
say "Deploying worker"
DEPLOY_OUTPUT="$(wrangler deploy 2>&1)"
echo "$DEPLOY_OUTPUT"

DEPLOYED_URL="$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev' | head -1 || true)"
[[ -n "$DEPLOYED_URL" ]] || warn "Could not parse deployed URL — check output above"

# ──────────────────────────────────────────────────────────────
# 7. Smoke-test the health endpoint
# ──────────────────────────────────────────────────────────────
if [[ -n "$DEPLOYED_URL" ]]; then
  say "Health check"
  if curl -fsS "$DEPLOYED_URL/v1/health" | grep -q '"ok":true'; then
    printf "\033[1;32m✓ /v1/health responding\033[0m\n"
  else
    warn "/v1/health did not return ok — worker may still be propagating (wait ~30s)"
  fi
fi

# ──────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────
cat <<EOF

────────────────────────────────────────────────────────────────
  DEPLOY COMPLETE
────────────────────────────────────────────────────────────────

Deployed URL:        ${DEPLOYED_URL:-(see output above)}
Database:            $DB_NAME
Schema:              applied
Webhook secret:      stored

Next steps:

  1. In LemonSqueezy dashboard → Settings → Webhooks → add endpoint:
       URL:    ${DEPLOYED_URL:-<your-worker-url>}/v1/webhook/lemonsqueezy
       Events: order_created, subscription_created, subscription_updated,
               subscription_cancelled, subscription_expired

  2. Update background/license.js API_BASE if the deployed URL is
     not https://api.smartselenium.dev:
       const API_BASE = "${DEPLOYED_URL:-<your-worker-url>}";

  3. Bind a custom domain (optional but recommended):
       Cloudflare dashboard → Workers → smart-selenium-licenses →
       Triggers → Add Custom Domain → api.smartselenium.dev

  4. Re-buy your own product in LS test mode to fire the webhook,
     then query the inserted license:
       wrangler d1 execute $DB_NAME --remote \\
         --command="SELECT key, email, tier, status, expires_at FROM licenses;"

────────────────────────────────────────────────────────────────
EOF
