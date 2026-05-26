# Spectara — License API (Cloudflare Worker, Polar.sh)

Tiny, dependency-free license-validation backend for the Spectara Pro
tier. Free Chrome users never reach this code path — only users who paste a
Polar-issued license key into the extension trigger one POST per 24 hours.

Payment + license-key provider: **Polar.sh** (dev-friendly merchant of record).

---

## Endpoints

| Method | Path | Caller | Purpose |
|--------|------|--------|---------|
| `POST` | `/v1/license/validate` | extension | Returns `{ valid, tier, expiresAt }` |
| `POST` | `/v1/webhook/polar` | Polar | Standard-Webhooks-signed events; provisions / cancels licenses |
| `GET`  | `/v1/health` | uptime checks | `{ ok: true, ts }` |

### `/v1/license/validate`

Request:
```json
{ "key": "8B4D00AD-3D0D-40DA-XXXX-XXXXXXXXXXXX" }
```
Response (valid):
```json
{ "valid": true, "tier": "pro", "expiresAt": 1735603199000 }
```
Response (invalid):
```json
{ "valid": false, "reason": "not-found" | "expired" | "cancelled" | "invalid-format" }
```

Accepts UUID format (Polar-issued) **and** the legacy `SL-XXXX-XXXX-XXXX`
format from earlier dev builds.

### `/v1/webhook/polar`

Signed via Standard Webhooks spec — three headers:

```
webhook-id:         01HJZE...
webhook-timestamp:  1716489600
webhook-signature:  v1,Base64HMACsig...
```

Signature computed as:
```
HMAC_SHA256( base64decode(secret_without_whsec_prefix),
             `${id}.${timestamp}.${rawBody}` )
→ base64
```

Events handled:

| Event | Action |
|-------|--------|
| `license_key.created` / `license_key.updated` | Insert or update license row with the Polar-issued key (primary code path when license-keys feature is enabled on the product) |
| `order.created` | Linkage row; if product has no license-key feature, generates a fallback `SL-` key |
| `subscription.created` / `subscription.updated` / `subscription.active` / `subscription.uncanceled` | Sets `status='active'`, updates `expires_at` from `current_period_end` |
| `subscription.canceled` / `subscription.revoked` | Marks `status='cancelled'` |

Unhandled events return `200` so Polar stops retrying.

---

## One-time setup (~10 minutes)

### A. Polar dashboard

1. Sign up at https://polar.sh (GitHub OAuth, instant).
2. Create an organization (e.g. `spectara`).
3. **Products → New product** → "Spectara Pro".
4. Add variants:
   - **Monthly** — $4.99 / month recurring
   - **Yearly** — $39 / year recurring
5. On the product → **Benefits** → **Add benefit** → **License keys**. Polar will generate a UUID-format license per checkout and email it to the buyer.
6. On each variant → **Metadata** → add `{ "tier": "pro" }` so the worker can route to the right tier (use `"team"` or `"enterprise"` for higher tiers).
7. Copy the **checkout URL** for the product. Update `popup/popup.js`:
   ```js
   const PRO_BUY_URL = "https://polar.sh/<org>/<product-slug>";
   ```

### B. Cloudflare Worker

```bash
cd worker/
bash deploy.sh
```

The script:
1. Installs `wrangler` if missing
2. Triggers `wrangler login` if not authenticated
3. Creates the D1 database and writes its id into `wrangler.toml`
4. Applies `schema.sql`
5. Prompts you to paste the Polar webhook signing secret (`whsec_...`)
6. Deploys the worker
7. Smoke-tests `/v1/health`
8. Prints the deployed URL + exact webhook URL to paste back into Polar

### C. Polar webhook configuration

Back in the Polar dashboard:

1. **Settings → Webhooks → Add endpoint**.
2. URL: paste `<DEPLOYED_URL>/v1/webhook/polar` from the deploy script summary.
3. Event subscriptions — tick:
   - `license_key.created`
   - `license_key.updated`
   - `order.created`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.active`
   - `subscription.canceled`
   - `subscription.revoked`
4. **Reveal secret** → copy → already pasted into `wrangler secret put POLAR_WEBHOOK_SECRET`. If you skipped that step, run it now:
   ```bash
   wrangler secret put POLAR_WEBHOOK_SECRET
   ```
5. Click **Send test event** in Polar → verify worker returns `200 ok`.

### D. End-to-end test

1. In Polar, switch on **Sandbox / Test mode**.
2. Buy your own product with the test card `4242 4242 4242 4242`.
3. Webhook fires → row appears in D1:
   ```bash
   wrangler d1 execute smart_selenium_licenses --remote \
     --command="SELECT key, email, tier, status, expires_at FROM licenses ORDER BY created_at DESC LIMIT 5;"
   ```
4. Paste the returned key (or the one Polar emailed you) into the extension's Pro tab → click **Verify** → should flip to "Pro Active".

---

## Cost

| Item | Free-tier ceiling | Monthly cost |
|------|------------------|--------------|
| Cloudflare Workers | 100k req/day | $0 |
| Cloudflare D1 reads | 5M / day | $0 |
| Cloudflare D1 writes | 100k / day | $0 |
| Cloudflare D1 storage | 5 GB | $0 |
| **Polar.sh fees** | — | **4% + $0.40 per transaction** |

At 10 paying users × 1 validation/day × 30 days = **300 reqs/month**.
At 10,000 paying users → **300k reqs/month**, still inside the free tier.

---

## Admin SQL

```bash
# Find licenses for an email
wrangler d1 execute smart_selenium_licenses --remote \
  --command="SELECT key, tier, status, expires_at FROM licenses WHERE email = 'x@y.com';"

# Revoke a license (refund / abuse)
wrangler d1 execute smart_selenium_licenses --remote \
  --command="UPDATE licenses SET status='refunded', updated_at=strftime('%s','now')*1000 WHERE key='XXXXXXXX-XXXX-...';"

# Tier breakdown
wrangler d1 execute smart_selenium_licenses --remote \
  --command="SELECT status, tier, COUNT(*) FROM licenses GROUP BY status, tier;"
```

---

## Security posture

- Webhook routes require a valid Standard Webhooks signature; bad sig → `401`.
- 5-minute timestamp window rejects replays.
- Constant-time signature comparison (no early-exit timing leak).
- Polar's license keys are UUIDs (~2^128 keyspace). Brute-force is infeasible against Cloudflare's rate limits.
- No PII beyond email is stored. No card data ever touches this worker (Polar is merchant of record).
- D1 binding limits the worker's blast radius — no other Cloudflare service can be reached if the worker is compromised.
