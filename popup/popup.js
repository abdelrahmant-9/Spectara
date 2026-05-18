/**
 * popup.js
 * Two states:
 *   - compact  → no capture history (minimized hero + Start)
 *   - expanded → has capture history (full UI + tabs)
 *
 * On Start Inspect: send START to content script, then close popup
 * so first page click captures element instead of just closing popup.
 */

const els = {
  app: document.getElementById("app"),
  compactView: document.getElementById("compactView"),
  expandedView: document.getElementById("expandedView"),

  startBtnCompact: document.getElementById("startBtnCompact"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  clearBtn: document.getElementById("clearBtn"),
  toggleTheme: document.getElementById("toggleTheme"),

  hint: document.getElementById("hint"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  toast: document.getElementById("toast"),

  locId: document.getElementById("locator-id"),
  locName: document.getElementById("locator-name"),
  locCss: document.getElementById("locator-css"),
  locXpath: document.getElementById("locator-xpath"),
  locRxpath: document.getElementById("locator-rxpath"),
  locBest: document.getElementById("locator-best"),

  javaCode: document.getElementById("java-code"),
  pomCode: document.getElementById("pom-code"),

  metaTag: document.getElementById("meta-tag"),
  metaId: document.getElementById("meta-id"),
  metaName: document.getElementById("meta-name"),
  metaClass: document.getElementById("meta-class"),
  metaType: document.getElementById("meta-type"),
  metaText: document.getElementById("meta-text"),
};

const STORAGE_KEY = "smart_locator_state";
const THEME_KEY = "smart_locator_theme";

/* ---------------- Tabs ---------------- */
document.querySelectorAll(".seg-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".seg-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    const target = document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`);
    if (target) target.classList.add("active");
  });
});

/* ---------------- Theme ---------------- */
(async function initTheme() {
  const { [THEME_KEY]: theme = "dark" } = await chrome.storage.local.get(THEME_KEY);
  document.documentElement.setAttribute("data-theme", theme);
})();

els.toggleTheme?.addEventListener("click", async (e) => {
  e.preventDefault();
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  await chrome.storage.local.set({ [THEME_KEY]: next });
});

/* ---------------- Tab helpers ---------------- */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING" });
    return true;
  } catch (_) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          "utils/xpathGenerator.js",
          "utils/cssGenerator.js",
          "utils/locatorPriority.js",
          "utils/codeGenerator.js",
          "content/content.js",
        ],
      });
      return true;
    } catch (err) {
      console.error("Inject failed", err);
      return false;
    }
  }
}

/* ---------------- Status ---------------- */
function setStatus(state) {
  if (!els.statusDot) return;
  els.statusDot.className = "dot";
  if (state === "active") {
    els.statusDot.classList.add("dot-active");
    els.statusText.textContent = "Inspecting";
  } else if (state === "result") {
    els.statusDot.classList.add("dot-result");
    els.statusText.textContent = "Result";
  } else {
    els.statusDot.classList.add("dot-idle");
    els.statusText.textContent = "Idle";
  }
}

function setHint(text, isError = false) {
  if (!els.hint) return;
  els.hint.innerHTML = text;
  els.hint.classList.toggle("error", isError);
}

/* ---------------- Compact ↔ Expanded ---------------- */
function showCompact() {
  els.compactView.classList.remove("hidden");
  els.expandedView.classList.add("hidden");
}
function showExpanded() {
  els.compactView.classList.add("hidden");
  els.expandedView.classList.remove("hidden");
}

/* ---------------- Start Inspect ---------------- */
async function handleStart() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return;

  if (tab.url && /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
    // Show in compact view if possible, else hint in expanded
    if (!els.expandedView.classList.contains("hidden")) {
      setHint("Cannot inspect browser internal pages. Open a regular website.", true);
    } else {
      alert("Cannot inspect browser internal pages.\nOpen a regular website and retry.");
    }
    return;
  }

  const ok = await ensureContentScript(tab.id);
  if (!ok) {
    if (!els.expandedView.classList.contains("hidden")) {
      setHint("Failed to inject content script. Reload the page and retry.", true);
    } else {
      alert("Failed to inject content script.\nReload the page and retry.");
    }
    return;
  }

  await chrome.tabs.sendMessage(tab.id, { type: "START_INSPECT" });

  if (els.startBtn) els.startBtn.disabled = true;
  if (els.stopBtn) els.stopBtn.disabled = false;
  setStatus("active");
  setHint("Hover and click any element. Hold <b>ALT</b> for exact node, <b>ESC</b> to cancel.");

  // Critical: close popup so first page click captures element
  // (otherwise first click just closes popup and event is consumed)
  setTimeout(() => window.close(), 80);
}

els.startBtnCompact?.addEventListener("click", handleStart);
els.startBtn?.addEventListener("click", handleStart);

/* ---------------- Stop Inspect ---------------- */
els.stopBtn?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (tab && tab.id) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "STOP_INSPECT" }); } catch (_) {}
  }
  if (els.startBtn) els.startBtn.disabled = false;
  if (els.stopBtn) els.stopBtn.disabled = true;
  setStatus("idle");
  setHint('Inspect stopped. Click <b>Start Inspect</b> to resume.');
});

/* ---------------- Clear ---------------- */
els.clearBtn?.addEventListener("click", async () => {
  await chrome.storage.local.remove(STORAGE_KEY);
  resetResults();
  setStatus("idle");
  showCompact();
});

/* ---------------- Copy ---------------- */
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const targetId = btn.dataset.copy;
    const node = document.getElementById(targetId);
    if (!node) return;
    const text = node.textContent || "";
    if (!text || text === "—") return;
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add("copied");
      btn.textContent = "Copied!";
      showToast("Copied to clipboard");
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = "Copy";
      }, 1200);
    } catch (err) {
      showToast("Copy failed", true);
    }
  });
});

function showToast(msg, isError = false) {
  els.toast.textContent = msg;
  els.toast.style.background = isError
    ? "rgba(255,69,58,0.95)"
    : "rgba(48,209,88,0.95)";
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1400);
}

/* ---------------- Render ---------------- */
function renderResult(data) {
  showExpanded();
  setStatus("result");

  if (data.promoted) {
    setHint(`Auto-promoted <b>&lt;${data.originalTag}&gt;</b> → <b>&lt;${data.element.tag}&gt;</b>. ALT+click for exact node.`);
  } else {
    setHint("Element captured. Switch tabs for Java / POM / Element info.");
  }

  els.locId.textContent = data.locators.id || "—";
  els.locName.textContent = data.locators.name || "—";
  els.locCss.textContent = data.locators.css || "—";
  els.locXpath.textContent = data.locators.xpath || "—";
  els.locRxpath.textContent = data.locators.relativeXpath || "—";
  els.locBest.textContent = data.best ? `By.${data.best.type} = ${data.best.value}` : "—";

  els.javaCode.textContent = data.javaCode || "—";
  els.pomCode.textContent = data.pomCode || "—";

  els.metaTag.textContent = data.element.tag || "—";
  els.metaId.textContent = data.element.id || "—";
  els.metaName.textContent = data.element.name || "—";
  els.metaClass.textContent = data.element.className || "—";
  els.metaType.textContent = data.element.type || "—";
  els.metaText.textContent = (data.element.text || "").slice(0, 200) || "—";
}

function resetResults() {
  [
    els.locId, els.locName, els.locCss, els.locXpath, els.locRxpath, els.locBest,
    els.javaCode, els.pomCode,
    els.metaTag, els.metaId, els.metaName, els.metaClass, els.metaType, els.metaText,
  ].forEach((n) => { if (n) n.textContent = "—"; });
}

/* ---------------- Live messages ---------------- */
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === "ELEMENT_CAPTURED" && msg.payload) {
    chrome.storage.local.set({ [STORAGE_KEY]: msg.payload });
    renderResult(msg.payload);
    if (els.startBtn) els.startBtn.disabled = false;
    if (els.stopBtn) els.stopBtn.disabled = true;
  }
  if (msg.type === "INSPECT_STOPPED") {
    if (els.startBtn) els.startBtn.disabled = false;
    if (els.stopBtn) els.stopBtn.disabled = true;
    setStatus("idle");
  }
});

/* ---------------- Boot ---------------- */
(async function boot() {
  const { [STORAGE_KEY]: saved } = await chrome.storage.local.get(STORAGE_KEY);
  if (saved && saved.element) {
    renderResult(saved);
  } else {
    showCompact();
  }
})();
