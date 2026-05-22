/**
 * Smart Selenium — license API (Cloudflare Worker)
 *
 * Routes:
 *   POST /v1/license/validate          — extension client
 *   POST /v1/webhook/lemonsqueezy      — LemonSqueezy webhook (HMAC-signed)
 *   GET  /v1/health                    — liveness probe
 *
 * Dependencies: zero. Uses Web Crypto + D1 binding only.
 *
 * Secrets (set with `wrangler secret put`):
 *   LS_WEBHOOK_SECRET                  — LemonSqueezy webhook signing secret
 *
 * Bindings (wrangler.toml):
 *   DB                                 — D1 database
 */

const KEY_PATTERN = /^SL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const ALLOWED_TIERS = new Set(["pro", "team", "enterprise"]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    try {
      if (method === "GET" && path === "/v1/health") {
        return cors(Response.json({ ok: true, ts: Date.now() }));
      }
      if (method === "POST" && path === "/v1/license/validate") {
        return cors(await handleValidate(request, env));
      }
      if (method === "POST" && path === "/v1/webhook/lemonsqueezy") {
        return await handleWebhook(request, env); // no CORS on webhooks
      }
      return cors(new Response("Not Found", { status: 404 }));
    } catch (err) {
      console.error("worker error", err);
      return cors(Response.json({ error: "internal" }, { status: 500 }));
    }
  },
};

/* ------------------------------------------------------------------ */
/*  CORS — extensions need permissive headers because chrome-extension://
    origins are not in any allowlist semantics                          */
/* ------------------------------------------------------------------ */
function cors(res) {
  const r = new Response(res.body, res);
  r.headers.set("Access-Control-Allow-Origin", "*");
  r.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "content-type, x-signature");
  r.headers.set("Access-Control-Max-Age", "86400");
  return r;
}

/* ------------------------------------------------------------------ */
/*  POST /v1/license/validate                                          */
/* ------------------------------------------------------------------ */
async function handleValidate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return Response.json({ valid: false, reason: "invalid-body" }, { status: 400 });
  }
  const key = String(body && body.key ? body.key : "").trim().toUpperCase();
  if (!KEY_PATTERN.test(key)) {
    return Response.json({ valid: false, reason: "invalid-format" });
  }

  const row = await env.DB.prepare(
    "SELECT key, tier, status, expires_at FROM licenses WHERE key = ?"
  ).bind(key).first();

  if (!row) return Response.json({ valid: false, reason: "not-found" });
  if (row.status !== "active") {
    return Response.json({ valid: false, reason: row.status });
  }
  const now = Date.now();
  if (row.expires_at && row.expires_at < now) {
    // Auto-expire stale rows on read so the table is self-cleaning.
    await env.DB.prepare(
      "UPDATE licenses SET status = 'expired', updated_at = ? WHERE key = ?"
    ).bind(now, key).run();
    return Response.json({ valid: false, reason: "expired" });
  }

  // Touch last_validated + bump counter (best-effort, don't block response on failure)
  try {
    await env.DB.prepare(
      "UPDATE licenses SET last_validated = ?, validations_count = validations_count + 1 WHERE key = ?"
    ).bind(now, key).run();
  } catch (e) {
    console.warn("counter update failed", e);
  }

  return Response.json({
    valid: true,
    tier: row.tier,
    expiresAt: row.expires_at,
  });
}

/* ------------------------------------------------------------------ */
/*  POST /v1/webhook/lemonsqueezy                                      */
/*  https://docs.lemonsqueezy.com/help/webhooks                        */
/* ------------------------------------------------------------------ */
async function handleWebhook(request, env) {
  const sigHex = request.headers.get("x-signature") || "";
  const rawBody = await request.text();
  const ok = await verifyHmac(rawBody, sigHex, env.LS_WEBHOOK_SECRET);
  if (!ok) return new Response("Bad signature", { status: 401 });

  let payload;
  try { payload = JSON.parse(rawBody); } catch (_) {
    return new Response("Bad JSON", { status: 400 });
  }
  const eventName = payload?.meta?.event_name;
  const data = payload?.data;
  if (!eventName || !data) return new Response("Missing event", { status: 400 });

  switch (eventName) {
    case "order_created":
      await upsertFromOrder(env, data);
      break;
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed":
      await upsertFromSubscription(env, data);
      break;
    case "subscription_cancelled":
    case "subscription_expired":
    case "subscription_paused":
      await markCancelledFromSubscription(env, data);
      break;
    default:
      // Unhandled event — ack so LemonSqueezy doesn't retry forever
      break;
  }
  return new Response("ok");
}

/* ------------------------------------------------------------------ */
/*  Webhook signature (HMAC-SHA256 with shared secret)                 */
/* ------------------------------------------------------------------ */
async function verifyHmac(rawBody, sigHex, secret) {
  if (!secret || !sigHex) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = bufToHex(sigBuf);
  return timingSafeEqualHex(expected, sigHex.toLowerCase());
}
function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/* ------------------------------------------------------------------ */
/*  License key generator (32-bit/block × 3 blocks of 4 chars)         */
/* ------------------------------------------------------------------ */
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0/1/O/I confusables
function generateLicenseKey() {
  const block = () => {
    const buf = crypto.getRandomValues(new Uint8Array(4));
    return Array.from(buf, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join("");
  };
  return `SL-${block()}-${block()}-${block()}`;
}

/* ------------------------------------------------------------------ */
/*  Webhook → DB writes                                                */
/* ------------------------------------------------------------------ */
async function upsertFromOrder(env, order) {
  // Treat one-time orders as lifetime licenses (Pro tier, no expiry).
  const attrs = order.attributes || {};
  const email = String(attrs.user_email || "").toLowerCase();
  const orderId = String(order.id);
  const tier = mapVariantToTier(attrs);

  if (!ALLOWED_TIERS.has(tier)) return;
  const existing = await env.DB.prepare(
    "SELECT key FROM licenses WHERE ls_order_id = ?"
  ).bind(orderId).first();
  if (existing) return; // already provisioned, idempotent

  const key = generateLicenseKey();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO licenses
       (key, email, tier, status, expires_at, created_at, updated_at, ls_order_id)
     VALUES (?, ?, ?, 'active', NULL, ?, ?, ?)`
  ).bind(key, email, tier, now, now, orderId).run();

  // Email delivery is handled by LemonSqueezy's built-in license-key email when
  // you configure "License keys" on the product. If you want a custom email,
  // call your transactional provider here (Resend / Postmark) — both have
  // worker-friendly REST APIs.
}

async function upsertFromSubscription(env, sub) {
  const attrs = sub.attributes || {};
  const email = String(attrs.user_email || "").toLowerCase();
  const subId = String(sub.id);
  const tier = mapVariantToTier(attrs);
  if (!ALLOWED_TIERS.has(tier)) return;

  const endsAtStr = attrs.ends_at || attrs.renews_at || null;
  const expires_at = endsAtStr ? Date.parse(endsAtStr) : null;
  const now = Date.now();

  const existing = await env.DB.prepare(
    "SELECT key FROM licenses WHERE ls_subscription_id = ?"
  ).bind(subId).first();

  if (existing) {
    await env.DB.prepare(
      `UPDATE licenses
         SET status = 'active', tier = ?, expires_at = ?, updated_at = ?
       WHERE key = ?`
    ).bind(tier, expires_at, now, existing.key).run();
  } else {
    const key = generateLicenseKey();
    await env.DB.prepare(
      `INSERT INTO licenses
         (key, email, tier, status, expires_at, created_at, updated_at, ls_subscription_id)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`
    ).bind(key, email, tier, expires_at, now, now, subId).run();
  }
}

async function markCancelledFromSubscription(env, sub) {
  const subId = String(sub.id);
  const now = Date.now();
  await env.DB.prepare(
    "UPDATE licenses SET status = 'cancelled', updated_at = ? WHERE ls_subscription_id = ?"
  ).bind(now, subId).run();
}

/* ------------------------------------------------------------------ */
/*  LemonSqueezy variant → tier mapping                                */
/*  Set custom_data.tier on the LemonSqueezy product variant, or fall  */
/*  back to a name heuristic.                                          */
/* ------------------------------------------------------------------ */
function mapVariantToTier(attrs) {
  const custom = attrs?.first_order_item?.product_options?.custom_data?.tier
    || attrs?.custom_data?.tier;
  if (custom && ALLOWED_TIERS.has(custom)) return custom;

  const name = String(attrs?.variant_name || attrs?.product_name || "").toLowerCase();
  if (name.includes("enterprise")) return "enterprise";
  if (name.includes("team")) return "team";
  return "pro";
}
