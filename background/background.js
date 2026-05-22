/**
 * background.js
 * Service worker. Persists captures from content script even when
 * the popup is closed (the normal case during inspect).
 *
 * Storage keys:
 *   smart_locator_state    → last single capture
 *   smart_locator_captures → array of captures in multi mode (newest first)
 *   smart_locator_license  → Pro license cache (owned by license.js)
 *
 * Storage cap: 100 most-recent captures. Older entries dropped to keep
 * chrome.storage.local well under the 10 MB hard quota even with very
 * deep DOM payloads.
 */

import {
  setLicense,
  refreshLicense,
  clearLicense,
  getLicenseStatus,
  getLicenseRaw,
  isPro,
} from "./license.js";

const STATE_KEY = "smart_locator_state";
const CAPTURES_KEY = "smart_locator_captures";
const MAX_CAPTURES = 100;

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First-run flag so popup can show onboarding once
    chrome.storage.local.set({ smart_locator_first_run: true }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === "ELEMENT_CAPTURED" && msg.payload) {
    handleCapture(msg.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("[SmartLocator] capture handler error:", err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true; // async response
  }

  /* -------- License management (Pro tier) ----------------------------
   * All license traffic is brokered through this service worker so the
   * extension never makes a network request from the popup or content
   * script. Free users never reach fetchValidation() because none of
   * these messages fire until a key is explicitly entered.
   * ------------------------------------------------------------------ */
  if (msg.type === "LICENSE_SET" && typeof msg.key === "string") {
    setLicense(msg.key)
      .then((rec) => sendResponse(rec))
      .catch((err) => sendResponse({ valid: false, reason: String(err) }));
    return true;
  }
  if (msg.type === "LICENSE_STATUS") {
    getLicenseStatus()
      .then((rec) => sendResponse(rec))
      .catch((err) => sendResponse({ valid: false, reason: String(err) }));
    return true;
  }
  if (msg.type === "LICENSE_RAW") {
    getLicenseRaw()
      .then((rec) => sendResponse(rec || null))
      .catch(() => sendResponse(null));
    return true;
  }
  if (msg.type === "LICENSE_REFRESH") {
    refreshLicense()
      .then((rec) => sendResponse(rec))
      .catch((err) => sendResponse({ valid: false, reason: String(err) }));
    return true;
  }
  if (msg.type === "LICENSE_CLEAR") {
    clearLicense()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg.type === "LICENSE_IS_PRO") {
    isPro()
      .then((b) => sendResponse({ pro: b }))
      .catch(() => sendResponse({ pro: false }));
    return true;
  }
});

async function handleCapture(payload) {
  try {
    if (payload.mode === "multi") {
      const stored = await chrome.storage.local.get(CAPTURES_KEY);
      let list = Array.isArray(stored[CAPTURES_KEY]) ? stored[CAPTURES_KEY] : [];
      list.unshift(payload);
      if (list.length > MAX_CAPTURES) list = list.slice(0, MAX_CAPTURES);
      await chrome.storage.local.set({
        [CAPTURES_KEY]: list,
        [STATE_KEY]: payload,
      });
    } else {
      await chrome.storage.local.set({
        [STATE_KEY]: payload,
        [CAPTURES_KEY]: [payload],
      });
    }
  } catch (err) {
    console.error("[SmartLocator] storage write failed:", err);
  }
}
