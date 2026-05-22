# Smart Selenium — License API (Cloudflare Worker)

Tiny, dependency-free license-validation backend for the Smart Selenium Pro
tier. Free Chrome users never reach this code path — only users who paste a
license key into the extension settings trigger one POST per 24 hours.

---

## Endpoints

| Method | Path | Caller | Purpose |
|--------|------|--------|---------|
| `POST` | `/v1/license/validate` | extension | Returns `{ valid, tier, expiresAt }` |
| `POST` | `/v1/webhook/lemonsqueezy` | LemonSqueezy | Provisions / cancels licenses on order + subscription events |
| `GET`  | `/v1/health` | uptime checks | `{ ok: true, ts }` |

### `/v1/license/validate`

Request:
```json
{ "key": "SL-A23B-C45D-E67F" }
```
Response (valid):
```json
{ "valid": true, "tier": "pro", "expiresAt": 1735603199000 }
```
Response (invalid):
```json
{ "valid": false, "reason": "not-found" | "expired" | "cancelled" | "invalid-format" }
```

### `/v1/webhook/lemonsqueezy`

HMAC-SHA256 signed via `X-Signature` header. Events handled:

| Event | Action |
|-------|--------|
| `order_created` | Inserts a lifetime license keyed by `ls_order_id` |
| `subscription_created` | Inserts a subscription license |
| `subscription_updated` | Updates `expires_at` + tier |
| `subscription_resumed` | Reactivates a cancelled subscription |
| `subscription_cancelled` / `subscription_expired` / `subscription_paused` | Marks the row `status = 'cancelled'` |

Unhandled events return `200` so LemonSqueezy stops retrying.

---

## Setup (one-time, ~5 minutes)

```bash
# 0. From the repo root:
cd worker/

# 1. Install wrangler
npm i -g wrangler

# 2. Authenticate
wrangler login

# 3. Create the D1 database
wrangler d1 create smart_selenium_licenses
#  → copy the returned database_id into wrangler.toml

# 4. Apply schema
wrangler d1 execute smart_selenium_licenses --file=schema.sql

# 5. Store the LemonSqueezy webhook secret
wrangler secret put LS_WEBHOOK_SECRET
#  → paste the secret from LemonSqueezy → Settings → Webhooks

# 6. Deploy
wrangler deploy
```

Output:
```
Published smart-selenium-licenses to https://smart-selenium-licenses.<account>.workers.dev
```

Bind a custom domain (recommended) — `api.smartselenium.dev` — from the
Cloudflare dashboard so the extension client doesn't hard-code a workers.dev URL.

---

## LemonSqueezy configuration

1. Create a product (e.g. **"Smart Selenium Pro"**, `$4.99/mo`) and one or more variants.
2. On each variant, open **Advanced** → **Custom Data** and add:
   ```json
   { "tier": "pro" }
   ```
   (or `"team"` / `"enterprise"` for higher tiers).
3. In **Settings → Webhooks**, add an endpoint pointing at
   `https://api.smartselenium.dev/v1/webhook/lemonsqueezy`.
4. Subscribe to the events: `order_created`, `subscription_*`.
5. Copy the **signing secret** into `wrangler secret put LS_WEBHOOK_SECRET`.

LemonSqueezy will auto-email the license key to the buyer when you enable
**License Keys** on the product. Custom email delivery (Resend, Postmark) is
a one-block addition inside `upsertFromOrder`.

---

## Cost

| Item | Free-tier ceiling | Monthly cost |
|------|------------------|--------------|
| Workers requests | 100k / day | $0 |
| D1 reads | 5M / day | $0 |
| D1 writes | 100k / day | $0 |
| D1 storage | 5 GB | $0 |

At 10 paying users × 1 validation / day × 30 days = **300 reqs/month**.
At 10,000 paying users → **300k reqs/month**, still well within free tier.

---

## Operations

Daily tasks: none. The worker is stateless and the DB is self-cleaning
(expired rows flip to `status='expired'` on read).

Manual admin operations:

```bash
# Find all licenses for an email
wrangler d1 execute smart_selenium_licenses --command="SELECT key, tier, status, expires_at FROM licenses WHERE email = 'x@y.com';"

# Revoke a license (refunds, abuse)
wrangler d1 execute smart_selenium_licenses --command="UPDATE licenses SET status='refunded', updated_at=strftime('%s','now')*1000 WHERE key='SL-AAAA-BBBB-CCCC';"

# Stats
wrangler d1 execute smart_selenium_licenses --command="SELECT status, COUNT(*) FROM licenses GROUP BY status;"
```

---

## Security posture

- Webhook routes require valid HMAC signature; bad sig → `401`.
- Constant-time signature comparison (no early-exit timing leak).
- License keys use a 32-char confusable-free alphabet, 3 blocks of 4 chars,
  ~2^60 keyspace. Brute-forcing a single key requires ~`10^18` requests
  against the worker — Cloudflare's rate limits stop that long before
  success.
- No PII beyond email is stored. No card data ever touches this worker
  (LemonSqueezy is merchant of record).
- D1 binding limits this worker's blast radius — no other Cloudflare
  service can be reached even if the worker is compromised.
