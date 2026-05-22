/**
 * pro/locatorValidator.js
 *
 * Pro feature: live locator validation. After a capture renders,
 * sends each candidate locator to the content script via
 * proApi.sendToTab and decorates the matching card with a badge:
 *
 *   ✓ unique    — exactly 1 match
 *   ⚠ N matches — multiple matches (still works in CI but ambiguous)
 *   ✗ broken    — zero matches (element gone or selector wrong)
 *
 * No network calls. Pure DOM query on the active tab.
 */

let api;
const LOCATOR_CARDS = [
  { id: "locator-id",      type: "id" },
  { id: "locator-name",    type: "name" },
  { id: "locator-css",     type: "cssSelector" },
  { id: "locator-xpath",   type: "xpath" },
  { id: "locator-rxpath",  type: "xpath" },
  { id: "locator-list",    type: "cssSelector", isList: true },
];

export function init(_api) {
  api = _api;
  api.onCaptureRendered(validateAll);
  // Validate the currently visible capture (if any) right away
  const cur = api.getActiveCapture();
  if (cur) validateAll(cur);
}

async function validateAll(capture) {
  if (!capture) return;
  for (const card of LOCATOR_CARDS) {
    const node = document.getElementById(card.id);
    if (!node) continue;
    const raw = (node.textContent || "").trim();
    if (!raw || raw === "—") {
      clearBadge(node);
      continue;
    }
    setChecking(node);
    const result = await sendValidate(card.type, raw, capture);
    paintBadge(node, result);
  }
}

async function sendValidate(type, value, capture) {
  // The content script needs to know the iframe + shadow context so it
  // queries inside the correct scope. We pass the chains so the content
  // script can resolve scope before evaluating.
  return api.sendToTab({
    type: "VALIDATE_LOCATOR",
    locator: { type, value },
    frameChain: capture.frameChain || [],
    shadowChain: capture.shadowChain || [],
  });
}

function setChecking(codeNode) {
  const head = findCardHead(codeNode);
  if (!head) return;
  let badge = head.querySelector(".validator-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "validator-badge";
    const copy = head.querySelector(".copy-btn");
    head.insertBefore(badge, copy);
  }
  badge.classList.remove("unique", "multi", "broken");
  badge.classList.add("checking");
  badge.textContent = "…";
}

function paintBadge(codeNode, result) {
  const head = findCardHead(codeNode);
  if (!head) return;
  let badge = head.querySelector(".validator-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "validator-badge";
    const copy = head.querySelector(".copy-btn");
    head.insertBefore(badge, copy);
  }
  badge.classList.remove("checking", "unique", "multi", "broken");

  if (!result || result.error) {
    badge.classList.add("broken");
    badge.textContent = "n/a";
    return;
  }
  const n = Number(result.count) || 0;
  if (n === 1) {
    badge.classList.add("unique");
    badge.textContent = "✓ 1";
  } else if (n === 0) {
    badge.classList.add("broken");
    badge.textContent = "✗ 0";
  } else {
    badge.classList.add("multi");
    badge.textContent = `⚠ ${n}`;
  }
}

function clearBadge(codeNode) {
  const head = findCardHead(codeNode);
  if (!head) return;
  const badge = head.querySelector(".validator-badge");
  if (badge) badge.remove();
}

function findCardHead(codeNode) {
  let card = codeNode.closest(".card");
  return card ? card.querySelector(".card-head") : null;
}
