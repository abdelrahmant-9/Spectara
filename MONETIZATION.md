# Monetization Architecture (Future)

> A blueprint for adding paid Pro features without bloating the current free, local-only extension.

The principle: **the current extension stays a self-contained free tool**. Pro features layer **on top** via an opt-in license check. Free users see zero new permissions, zero new network calls.

---

## 1. Product Surface

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Single-element capture, 5 locator strategies + smart ranking, Selenium Java snippet, auto-promote, Pause mode, themes, keyboard shortcuts |
| **Pro** | **$4.99/mo** or **$39/yr** (save 35%) · **7-day free trial** | Multi-element capture, POM generation (single + combined), iframe traversal, Shadow DOM traversal, list detection, Playwright TS + Python codegen, export .java, live locator validation, Cypress + cloud sync (soon), priority email support |
| **Team** | $199 / yr per 5 seats | Pro + shared POM library + Slack/Jira export + admin dashboard |
| **Enterprise** | Custom | Team + SSO + private cloud + on-prem option + SLA |

---

## 2. Architectural Constraints

The extension must continue to:

1. Work fully offline for free users
2. Make zero network requests when no Pro license is present
3. Pass Chrome Web Store review on the "data collection: none" path for free installs
4. Never block a free feature behind login
5. Keep the bundle under 200 KB total

These constraints rule out:

- Embedding an auth SDK that pings on every popup open
- Loading any third-party script at runtime (forbidden by Chrome Web Store policy anyway in MV3)
- Server-side rendering of any UI
- Always-on telemetry

---

## 3. Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Chrome Extension (open-core, MIT core)                  │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Free core   │    │  Pro module  │  loaded only      │
│  │ (current)    │    │ (gated)      │  if license valid │
│  └──────────────┘    └──────┬───────┘                   │
│                             │                           │
│                       license check                     │
│                             │                           │
└─────────────────────────────┼───────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────┐
         │  Tiny license API (Vercel / Cloudflare Worker) │
         │                                                │
         │  POST /v1/license/validate                     │
         │  body: { key: "SL-xxxx-xxxx" }                 │
         │  returns: { valid, tier, expiresAt }           │
         │                                                │
         │  Caches result in chrome.storage for 24h       │
         └────────────────────────────────────┘
```

### Key design choices

1. **License key, not OAuth.** A 16-char alphanumeric key (`SL-XXXX-XXXX-XXXX`) is delivered by email after purchase. User pastes into a Settings panel inside the popup. Removes the need for full OAuth, password reset, etc.

2. **24-hour grace cache.** Once validated, the result is cached locally for 24 hours. The extension keeps working offline indefinitely as long as the user opens it at least once every 30 days. After 30 days of no validation, Pro features lock and the user is prompted to reconnect.

3. **Single endpoint.** One serverless function: `POST /v1/license/validate`. Returns `{ valid, tier, expiresAt }`. No user data sent — just the key. Hosted on Cloudflare Workers (free tier handles 100k requests/day).

4. **Polar.sh handles all payment.** No PCI scope. Polar is the chosen merchant of record: handles VAT in 60+ countries, issues UUID license keys natively, GitHub-OAuth signup (no KYC paperwork), 4% + $0.40 per transaction. Alternatives: Paddle (5% + $0.50, stricter KYC), Gumroad (10% flat), Stripe direct (cheapest but needs own backend + Stripe Atlas for non-US entities).

5. **Pro module is lazy-loaded.** Free users never download the Pro JS. Use `chrome.scripting.executeScript` to inject Pro modules from the extension package only when license is valid.

---

## 4. File Layout (additive)

```
Spectara/
├── manifest.json
├── background/
│   ├── background.js          (existing, unchanged)
│   └── license.js             NEW — license validation + cache
├── popup/
│   ├── popup.html             (add Settings tab + license input)
│   ├── popup.css
│   └── popup.js               (add tier-aware UI gates)
├── pro/                       NEW — only loaded when Pro
│   ├── playwright.js
│   ├── cypress.js
│   ├── shadow-dom-traversal.js
│   ├── locator-validator.js
│   └── ai-assertions.js
├── content/
├── utils/
└── assets/
```

Pro modules are loaded conditionally:

```js
// In popup.js (sketch)
async function loadProModules() {
  const license = await chrome.storage.local.get("smart_locator_license");
  if (!license?.valid) return;

  // Dynamically import Pro logic only when license is valid
  const { default: playwrightCodegen } = await import(
    chrome.runtime.getURL("pro/playwright.js")
  );
  window.SmartLocatorPro = { playwrightCodegen };
}
```

Free users never execute that branch → bundle stays lean.

---

## 5. License Validation Logic (sketch)

```js
// background/license.js (sketch)
const LICENSE_KEY = "smart_locator_license";
const CACHE_TTL = 24 * 60 * 60 * 1000;    // 24 hours
const GRACE_PERIOD = 30 * 24 * 60 * 60 * 1000;  // 30 days offline grace

async function validateLicense(key) {
  // Check cache first
  const stored = await chrome.storage.local.get(LICENSE_KEY);
  const cached = stored[LICENSE_KEY];
  const now = Date.now();

  if (cached && cached.checkedAt > now - CACHE_TTL) {
    return cached;  // still fresh
  }

  // Cache stale → re-validate
  try {
    const res = await fetch("https://api.spectara.app/v1/license/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = await res.json();
    const result = {
      key,
      valid: data.valid === true,
      tier: data.tier || null,
      expiresAt: data.expiresAt || null,
      checkedAt: now,
    };
    await chrome.storage.local.set({ [LICENSE_KEY]: result });
    return result;
  } catch (_) {
    // Network failed: use stale cache if within grace period
    if (cached && cached.checkedAt > now - GRACE_PERIOD) return cached;
    return { valid: false, tier: null, reason: "offline-too-long" };
  }
}
```

---

## 6. Backend (minimal)

**Stack:** Cloudflare Workers (free tier) + Cloudflare D1 (SQLite at edge, free tier).

**Schema:**

```sql
CREATE TABLE licenses (
  key TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  tier TEXT NOT NULL,           -- 'pro' | 'team' | 'enterprise'
  status TEXT NOT NULL,         -- 'active' | 'cancelled' | 'refunded'
  expires_at INTEGER,           -- unix ms, null = lifetime
  created_at INTEGER NOT NULL,
  last_validated INTEGER
);
```

**Endpoint:**

```js
// CF Worker (sketch)
export default {
  async fetch(req, env) {
    if (new URL(req.url).pathname !== "/v1/license/validate") {
      return new Response("Not found", { status: 404 });
    }
    const { key } = await req.json();
    if (!key || !/^SL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
      return Response.json({ valid: false, reason: "invalid-format" });
    }
    const row = await env.DB.prepare("SELECT * FROM licenses WHERE key = ?").bind(key).first();
    if (!row) return Response.json({ valid: false, reason: "not-found" });
    if (row.status !== "active") return Response.json({ valid: false, reason: row.status });
    if (row.expires_at && row.expires_at < Date.now()) {
      return Response.json({ valid: false, reason: "expired" });
    }
    // touch last_validated
    await env.DB.prepare("UPDATE licenses SET last_validated = ? WHERE key = ?")
      .bind(Date.now(), key).run();
    return Response.json({
      valid: true,
      tier: row.tier,
      expiresAt: row.expires_at,
    });
  },
};
```

**Polar webhook** populates the licenses table on purchase:

```js
// /v1/webhook/polar
// On order_created:
INSERT INTO licenses (key, email, tier, status, expires_at, created_at)
VALUES (?, ?, 'pro', 'active', ?, strftime('%s','now')*1000)
```

---

## 7. Cloud Sync Architecture (Pro feature)

For "sync your captures across devices":

- Captures encrypted client-side with key derived from license key (PBKDF2)
- Stored in CF R2 (S3-compatible) keyed by `sha256(licenseKey)`
- ~100 KB per user typical → 1 GB R2 free tier holds 10k users
- Sync triggered on user action only (button in popup), not automatic

This means the server **cannot** read the captures even if compromised — only the license-key holder can decrypt.

---

## 8. SSO / Team Tier

For Team and Enterprise tiers, add:

- Team admin endpoint: invite by email, revoke license
- Seat-based licensing: one license key → N device activations
- Optional SSO via WorkOS or Google OAuth, but only on the **dashboard website**, not the extension itself

---

## 9. Marketing-side gates

Some features should be visible-but-locked for free users (drives conversion):

- Show **"Playwright codegen ⓘ Pro"** badge on the Java tab — clicking shows a Pro upgrade modal
- Show **"AI assertion suggestions ⓘ Pro"** in the POM tab
- Show **"Export as .java file ⓘ Pro"** button next to Copy

These are pure UI signals — no Pro code is downloaded, just an upgrade CTA.

---

## 10. Cost model

| Item | Monthly cost | Notes |
|------|--------------|-------|
| Cloudflare Workers | $0 | Free tier: 100k req/day → 3M/month |
| Cloudflare D1 | $0 | Free tier: 5 GB |
| Cloudflare R2 | $0–5 | Free tier: 10 GB egress / month |
| Polar.sh | 4% + $0.40 per sale | Handles VAT, EU tax, refunds, native UUID license keys |
| Domain (spectara.app) | $1 | $12/yr namecheap |
| Email (support@) | $0 | Forward via Cloudflare Email Routing |
| **Total fixed** | **~$1/mo** | Until ~1000 paying users |

Break-even: **3 paying customers** ($3 × $4.99 = $15/mo vs $1 hosting).

---

## 11. Migration path

When you decide to ship Pro:

1. Add `pro/` directory with feature modules
2. Add `background/license.js` + Settings tab in popup
3. Deploy CF Worker + create D1 database
4. Set up Polar.sh product + license-keys benefit + webhook → CF Worker
5. Free users see the new UI but nothing changes for them
6. Ship a `1.4.0` version with the Pro plumbing
7. Announce Pro via LinkedIn + email list

**Critical:** the manifest **does not change** for Pro features. No new permissions needed — `chrome.storage`, `fetch` from background, and `chrome.runtime.getURL` are already implicit.

---

## 12. Anti-piracy posture (realistic)

- License keys can be shared / leaked. Accept it.
- The 24-hour cache + 30-day grace means even a stolen key works offline for a month — not a security concern for a $4.99/mo product
- Server-side: invalidate keys via dashboard if abuse is detected (>5 unique device fingerprints per key per week)
- Don't waste time on DRM. Spend that time on features.

---

## 13. What NOT to do

- ❌ Force account creation for free users
- ❌ Add analytics SDK to "measure adoption" — Chrome Web Store stats are enough
- ❌ Bundle the Pro modules in the free build
- ❌ Use Stripe directly (PCI scope is real); use Polar / Paddle / Gumroad as merchant of record
- ❌ Build a SaaS dashboard before you have 100 paying users
- ❌ Add a referral program before product-market fit
- ❌ Raise venture capital — this is a $200-500 MRR solo bootstrap, not a unicorn
