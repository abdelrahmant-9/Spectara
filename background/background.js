/**
 * background.js
 * Service worker. Persists captures from content script even when
 * the popup is closed (which is the normal case during inspect).
 *
 * Storage keys:
 *   smart_locator_state    → last single capture
 *   smart_locator_captures → array of captures in multi mode (newest first)
 */

const STATE_KEY = "smart_locator_state";
const CAPTURES_KEY = "smart_locator_captures";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[SmartLocator] installed");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === "ELEMENT_CAPTURED" && msg.payload) {
    handleCapture(msg.payload).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
});

async function handleCapture(payload) {
  if (payload.mode === "multi") {
    // Append to captures array (newest first), keep state in sync
    const stored = await chrome.storage.local.get(CAPTURES_KEY);
    const list = Array.isArray(stored[CAPTURES_KEY]) ? stored[CAPTURES_KEY] : [];
    list.unshift(payload);
    await chrome.storage.local.set({
      [CAPTURES_KEY]: list,
      [STATE_KEY]: payload, // also keep latest as single state
    });
  } else {
    // Single mode: replace state, reset captures to just this one
    await chrome.storage.local.set({
      [STATE_KEY]: payload,
      [CAPTURES_KEY]: [payload],
    });
  }
}
