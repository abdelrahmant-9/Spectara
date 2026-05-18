/**
 * background.js
 * Service worker. Lightweight relay + lifecycle handler.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("[SmartLocator] installed");
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !msg.type) return;
  if (msg.type === "ELEMENT_CAPTURED") {
    chrome.storage.local.set({ smart_locator_state: msg.payload });
  }
});
