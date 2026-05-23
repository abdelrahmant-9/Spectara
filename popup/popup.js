/**
 * popup.js
 * Modes: Single | Multi-capture
 * Storage: captures[] array (most recent first) + mode
 * Two view states: compact (empty) | expanded (have history)
 */

const els = {
  app: document.getElementById("app"),
  compactView: document.getElementById("compactView"),
  expandedView: document.getElementById("expandedView"),

  startBtnCompact: document.getElementById("startBtnCompact"),
  startBtn: document.getElementById("startBtn"),
  startBtnLabel: document.getElementById("startBtnLabel"),
  stopBtn: document.getElementById("stopBtn"),
  clearBtn: document.getElementById("clearBtn"),
  toggleTheme: document.getElementById("toggleTheme"),

  hint: document.getElementById("hint"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  toast: document.getElementById("toast"),

  capturesStrip: document.getElementById("capturesStrip"),
  capturesCount: document.getElementById("capturesCount"),
  capturesList: document.getElementById("capturesList"),
  clearCapturesBtn: document.getElementById("clearCapturesBtn"),
  copyAllBtn: document.getElementById("copyAllBtn"),
  copyAllFormat: document.getElementById("copyAllFormat"),

  locId: document.getElementById("locator-id"),
  locName: document.getElementById("locator-name"),
  locCss: document.getElementById("locator-css"),
  locXpath: document.getElementById("locator-xpath"),
  locRxpath: document.getElementById("locator-rxpath"),
  locBest: document.getElementById("locator-best"),

  listCard: document.getElementById("listCard"),
  listCount: document.getElementById("listCount"),
  locList: document.getElementById("locator-list"),

  javaListCard: document.getElementById("javaListCard"),
  javaListCode: document.getElementById("java-list-code"),

  javaCode: document.getElementById("java-code"),
  pomCode: document.getElementById("pom-code"),

  metaTag: document.getElementById("meta-tag"),
  metaId: document.getElementById("meta-id"),
  metaName: document.getElementById("meta-name"),
  metaClass: document.getElementById("meta-class"),
  metaType: document.getElementById("meta-type"),
  metaText: document.getElementById("meta-text"),

  frameCard: document.getElementById("frameCard"),
  frameChainList: document.getElementById("frameChainList"),
  frameDepth: document.getElementById("frameDepth"),
  frameStatusPill: document.getElementById("frameStatusPill"),

  shadowCard: document.getElementById("shadowCard"),
  shadowChainList: document.getElementById("shadowChainList"),
  shadowDepth: document.getElementById("shadowDepth"),
  shadowStatusPill: document.getElementById("shadowStatusPill"),

  onboardBanner: document.getElementById("onboardBanner"),
  onboardClose: document.getElementById("onboardClose"),
  onboardShortcut: document.getElementById("onboardShortcut"),

  // Pro tab
  proUnlicensed: document.getElementById("proUnlicensed"),
  proLicensed: document.getElementById("proLicensed"),
  proTabPill: document.getElementById("proTabPill"),
  proDotNav: document.getElementById("proDotNav"),
  proActiveDetail: document.getElementById("proActiveDetail"),
  proTierChip: document.getElementById("proTierChip"),
  proKeyDisplay: document.getElementById("proKeyDisplay"),
  proExpiresAt: document.getElementById("proExpiresAt"),
  buyProBtn: document.getElementById("buyProBtn"),
  licenseKeyInput: document.getElementById("licenseKeyInput"),
  licenseVerifyBtn: document.getElementById("licenseVerifyBtn"),
  licenseRefreshBtn: document.getElementById("licenseRefreshBtn"),
  licenseClearBtn: document.getElementById("licenseClearBtn"),
  licenseError: document.getElementById("licenseError"),

  // Java sub-tabs + Playwright
  playwrightProPill: document.getElementById("playwrightProPill"),
  playwrightUpgrade: document.getElementById("playwrightUpgrade"),
  playwrightUpgradeBtn: document.getElementById("playwrightUpgradeBtn"),
  playwrightCode: document.getElementById("playwright-code"),
  playwrightLang: document.getElementById("playwrightLang"),

  // POM tab
  exportJavaBtn: document.getElementById("exportJavaBtn"),
};

const STORAGE_KEY = "smart_locator_state";
const CAPTURES_KEY = "smart_locator_captures";
const MODE_KEY = "smart_locator_mode";
const THEME_KEY = "smart_locator_theme";

// OS detection for keybinding display
const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(
  (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || ""
);
const KEY = {
  ALT:   IS_MAC ? "⌥ Option" : "Alt",
  ALT_S: IS_MAC ? "⌥"        : "Alt",
  ESC:   "Esc",
  PAUSE: "P",
};

let currentMode = "single";
let captures = []; // [{ element, locators, best, isList, listLocator, javaCode, pomCode, ... }]
let activeIndex = 0;

/* ---------------- Result Tabs ---------------- */
document.querySelectorAll(".tab-panel").forEach(() => {});
document.querySelectorAll('.seg-tabs[role="tablist"]').forEach((bar) => {
  bar.addEventListener("click", (e) => {
    const tab = e.target.closest(".seg-tab");
    if (!tab) return;

    // Mode tabs?
    if (tab.dataset.mode) {
      bar.querySelectorAll(".seg-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      // mirror across both mode tab bars
      const newMode = tab.dataset.mode;
      currentMode = newMode;
      chrome.storage.local.set({ [MODE_KEY]: newMode });
      document.querySelectorAll('.seg-tabs[id^="modeTabs"]').forEach((other) => {
        other.querySelectorAll(".seg-tab").forEach((t) => {
          t.classList.toggle("active", t.dataset.mode === newMode);
        });
      });
      updateStartLabel();
      return;
    }

    // Result tabs
    if (tab.dataset.tab) {
      const sibs = tab.parentElement.querySelectorAll(".seg-tab");
      sibs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      const panel = document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`);
      if (panel) panel.classList.add("active");
    }
  });
});

function updateStartLabel() {
  if (els.startBtnLabel) {
    els.startBtnLabel.textContent = currentMode === "multi" ? "Start Multi-capture" : "Start Inspect";
  }
  if (els.startBtnCompact) {
    const span = els.startBtnCompact.querySelector("span:last-child");
    if (span) span.textContent = currentMode === "multi" ? "Start Multi-capture" : "Start Inspect";
  }
  // Update compact-view kbd hints to OS-correct labels
  document.querySelectorAll(".kbd-row").forEach((row) => {
    const kbds = row.querySelectorAll(".kbd");
    if (kbds.length >= 2) {
      kbds[0].textContent = KEY.ALT_S;
      kbds[1].textContent = KEY.ESC;
    }
  });
}

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
    els.statusText.textContent = currentMode === "multi" ? "Multi-capture" : "Inspecting";
  } else if (state === "result") {
    els.statusDot.classList.add("dot-result");
    els.statusText.textContent = currentMode === "multi" ? `${captures.length} captured` : "Result";
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

  if (tab.url && /^(chrome|edge|about|chrome-extension|view-source):/i.test(tab.url)) {
    const msg = "This page is a browser internal page (chrome://, edge://, etc.) and cannot be inspected. Open any normal website and try again.";
    if (!els.expandedView.classList.contains("hidden")) {
      setHint(msg, true);
    } else {
      // Inline in compact view instead of disruptive alert
      const hint = document.querySelector(".muted-hint");
      if (hint) {
        hint.innerHTML = `<span style="color:var(--danger)">${msg}</span>`;
      } else {
        alert(msg);
      }
    }
    return;
  }
  if (tab.url && /^https:\/\/chromewebstore\.google\.com/i.test(tab.url)) {
    const msg = "The Chrome Web Store blocks all extension content scripts. Open a regular website to inspect.";
    if (!els.expandedView.classList.contains("hidden")) setHint(msg, true);
    else alert(msg);
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

  await chrome.tabs.sendMessage(tab.id, { type: "START_INSPECT", mode: currentMode });

  if (els.startBtn) els.startBtn.disabled = true;
  if (els.stopBtn) els.stopBtn.disabled = false;
  setStatus("active");
  setHint(
    currentMode === "multi"
      ? `<b>Multi-capture:</b> click multiple elements. Press <b>Done</b> on the floating panel when finished.`
      : `Hover and click any element. <b>${KEY.ALT}</b> for exact node, <b>${KEY.ESC}</b> to cancel.`
  );

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
  await chrome.storage.local.remove([STORAGE_KEY, CAPTURES_KEY]);
  captures = [];
  activeIndex = 0;
  resetResults();
  setStatus("idle");
  showCompact();
});

els.clearCapturesBtn?.addEventListener("click", async () => {
  captures = [];
  activeIndex = 0;
  await chrome.storage.local.remove([STORAGE_KEY, CAPTURES_KEY]);
  resetResults();
  renderCapturesList();
  showCompact();
});

/* ---------------- Copy all captures ---------------- */
// Stop the <select> inside the link-btn from triggering the parent click.
els.copyAllFormat?.addEventListener("click", (e) => e.stopPropagation());
els.copyAllFormat?.addEventListener("change", (e) => e.stopPropagation());

els.copyAllBtn?.addEventListener("click", async (e) => {
  // Ignore clicks on the format dropdown itself
  if (e.target && e.target.tagName === "SELECT") return;
  if (!captures.length) return;

  const fmt = (els.copyAllFormat && els.copyAllFormat.value) || "java";
  const text = formatAllCaptures(captures, fmt);
  try {
    await navigator.clipboard.writeText(text);
    els.copyAllBtn.classList.add("copied");
    const labelEl = els.copyAllBtn.querySelector(".copy-all-label");
    const prev = labelEl ? labelEl.textContent : "";
    if (labelEl) labelEl.textContent = `Copied ${captures.length}!`;
    showToast(`Copied ${captures.length} capture${captures.length === 1 ? "" : "s"}`);
    setTimeout(() => {
      els.copyAllBtn.classList.remove("copied");
      if (labelEl) labelEl.textContent = prev || "Copy all";
    }, 1400);
  } catch (_) {
    showToast("Copy failed", true);
  }
});

/**
 * Format every capture in one of three shapes.
 * - "java"     → `private final By name = By.id("...");` block, ready to drop in a POM
 * - "locators" → human-readable list with name + best locator
 * - "json"     → full structured payload array
 */
function formatAllCaptures(list, fmt) {
  // De-duplicate field names — same naming logic as the POM builder
  const seen = new Map();
  const enriched = list.map((c) => {
    let name = variableName(c.element);
    if (seen.has(name)) {
      const n = seen.get(name) + 1;
      seen.set(name, n);
      name = `${name}${n}`;
    } else {
      seen.set(name, 1);
    }
    return { ...c, fieldName: name };
  });

  if (fmt === "json") {
    // Strip generated code to keep payload light
    const lean = enriched.map((c) => ({
      name: c.fieldName,
      url: c.url,
      element: c.element,
      locators: c.locators,
      best: c.best,
      isList: !!c.isList,
      listLocator: c.listLocator || null,
      listCount: c.listCount || 0,
      frameChain: c.frameChain || [],
      shadowChain: c.shadowChain || [],
      capturedAt: c.capturedAt,
    }));
    return JSON.stringify(lean, null, 2);
  }

  if (fmt === "locators") {
    const lines = [`// ${list.length} capture${list.length === 1 ? "" : "s"} — Smart Selenium`];
    enriched.forEach((c) => {
      const best = c.isList && c.listLocator ? c.listLocator : c.best;
      const tag = (c.element.tag || "").toLowerCase();
      const extras = [];
      if (c.frameChain && c.frameChain.length) extras.push(`frames=${c.frameChain.length}`);
      if (c.shadowChain && c.shadowChain.length) extras.push(`shadow=${c.shadowChain.length}`);
      if (c.isList) extras.push(`list=${c.listCount}`);
      const meta = extras.length ? ` (${extras.join(", ")})` : "";
      lines.push(`${c.fieldName}  [<${tag}>${meta}]`);
      lines.push(`  By.${best.type} = ${best.value}`);
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  // Default: Java field declarations
  const lines = [];
  enriched.forEach((c) => {
    const best = c.isList && c.listLocator ? c.listLocator : c.best;
    if (!best || !best.value) {
      lines.push(`// ${c.fieldName}: no locator`);
      return;
    }
    lines.push(`private final By ${c.fieldName} = ${byLiteral(best.type, best.value)};`);
  });
  return lines.join("\n");
}

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
  els.toast.style.background = isError ? "rgba(255,69,58,0.95)" : "rgba(48,209,88,0.95)";
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1400);
}

/* ---------------- Render single capture ---------------- */
function renderCapture(data) {
  els.locId.textContent = data.locators.id || "—";
  els.locName.textContent = data.locators.name || "—";
  els.locCss.textContent = data.locators.css || "—";
  els.locXpath.textContent = data.locators.xpath || "—";
  els.locRxpath.textContent = data.locators.relativeXpath || "—";
  els.locBest.textContent = data.best ? `By.${data.best.type} = ${data.best.value}` : "—";

  // List card
  if (data.isList && data.listLocator) {
    els.listCard.classList.remove("hidden");
    els.listCount.textContent = data.listCount || 0;
    els.locList.textContent = `By.${data.listLocator.type} = ${data.listLocator.value}`;
    els.javaListCard.classList.remove("hidden");
    els.javaListCode.textContent = data.javaListCode || "—";
  } else {
    els.listCard.classList.add("hidden");
    els.javaListCard.classList.add("hidden");
  }

  els.javaCode.textContent = data.javaCode || "—";

  // Single vs combined POM
  if (currentMode === "multi" && captures.length > 0) {
    els.pomCode.textContent = generateCombinedPom();
  } else {
    els.pomCode.textContent = data.pomCode || "—";
  }

  els.metaTag.textContent = data.element.tag || "—";
  els.metaId.textContent = data.element.id || "—";
  els.metaName.textContent = data.element.name || "—";
  els.metaClass.textContent = data.element.className || "—";
  els.metaType.textContent = data.element.type || "—";
  els.metaText.textContent = (data.element.text || "").slice(0, 200) || "—";

  renderFrameChain(data.frameChain || []);
  renderShadowChain(data.shadowChain || [], data.shadowClosed === true);
}

function renderShadowChain(chain, closed) {
  const has = Array.isArray(chain) && chain.length > 0;
  if (els.shadowStatusPill) els.shadowStatusPill.classList.toggle("hidden", !has);
  if (!els.shadowCard || !els.shadowChainList) return;

  if (!has) {
    els.shadowCard.classList.add("hidden");
    els.shadowChainList.innerHTML = "";
    if (els.shadowDepth) els.shadowDepth.textContent = "";
    return;
  }

  els.shadowCard.classList.remove("hidden");
  if (els.shadowDepth) {
    els.shadowDepth.textContent = `${chain.length} root${chain.length === 1 ? "" : "s"}` +
      (closed ? " · contains closed root" : "");
  }

  els.shadowChainList.innerHTML = "";
  chain.forEach((h) => {
    const li = document.createElement("li");
    if (h.resolved && h.best) {
      const loc = document.createElement("div");
      loc.className = "f-locator";
      loc.textContent = `<${h.tag}>  →  By.${h.best.type} = ${h.best.value}`;
      li.appendChild(loc);
    } else {
      const loc = document.createElement("div");
      loc.className = "f-locator f-unresolved";
      loc.textContent = h.note || "Closed shadow root — not queryable";
      li.appendChild(loc);
    }
    els.shadowChainList.appendChild(li);
  });
}

function renderFrameChain(chain) {
  const has = Array.isArray(chain) && chain.length > 0;
  if (els.frameStatusPill) els.frameStatusPill.classList.toggle("hidden", !has);
  if (!els.frameCard || !els.frameChainList) return;

  if (!has) {
    els.frameCard.classList.add("hidden");
    els.frameChainList.innerHTML = "";
    if (els.frameDepth) els.frameDepth.textContent = "";
    return;
  }

  els.frameCard.classList.remove("hidden");
  if (els.frameDepth) els.frameDepth.textContent = `${chain.length} level${chain.length === 1 ? "" : "s"} deep`;

  els.frameChainList.innerHTML = "";
  chain.forEach((f) => {
    const li = document.createElement("li");
    if (f.resolved && f.best) {
      const loc = document.createElement("div");
      loc.className = "f-locator";
      loc.textContent = `By.${f.best.type} = ${f.best.value}`;
      li.appendChild(loc);
    } else {
      const loc = document.createElement("div");
      loc.className = "f-locator f-unresolved";
      loc.textContent = f.note || "Unresolved iframe";
      li.appendChild(loc);
    }
    if (f.url) {
      const url = document.createElement("div");
      url.className = "f-url";
      url.textContent = f.url;
      li.appendChild(url);
    }
    els.frameChainList.appendChild(li);
  });
}

/* ---------------- Captures list rendering ---------------- */
function renderCapturesList() {
  if (currentMode !== "multi" || captures.length === 0) {
    els.capturesStrip.classList.add("hidden");
    return;
  }
  els.capturesStrip.classList.remove("hidden");
  els.capturesCount.textContent = `${captures.length} captured`;
  els.capturesList.innerHTML = "";

  captures.forEach((c, idx) => {
    const li = document.createElement("li");
    li.className = idx === activeIndex ? "active" : "";
    li.dataset.index = idx;

    const label = document.createElement("span");
    label.className = "cap-label";
    label.textContent = describeCapture(c);

    const remove = document.createElement("button");
    remove.className = "cap-remove";
    remove.textContent = "×";
    remove.title = "Remove";
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      removeCapture(idx);
    });

    li.appendChild(label);
    if (c.isList) {
      const tag = document.createElement("span");
      tag.className = "cap-list-tag";
      tag.textContent = `List ${c.listCount}`;
      li.appendChild(tag);
    }
    if (Array.isArray(c.frameChain) && c.frameChain.length) {
      const tag = document.createElement("span");
      tag.className = "cap-frame-tag";
      tag.textContent = `iframe ×${c.frameChain.length}`;
      tag.title = "Element captured inside an iframe";
      li.appendChild(tag);
    }
    if (Array.isArray(c.shadowChain) && c.shadowChain.length) {
      const tag = document.createElement("span");
      tag.className = "cap-shadow-tag";
      tag.textContent = `shadow ×${c.shadowChain.length}`;
      tag.title = "Element captured inside Shadow DOM";
      li.appendChild(tag);
    }
    li.appendChild(remove);

    li.addEventListener("click", () => {
      activeIndex = idx;
      renderCapture(captures[idx]);
      renderCapturesList();
    });

    els.capturesList.appendChild(li);
  });
}

function describeCapture(c) {
  const tag = c.element.tag || "el";
  const label =
    c.element.id ||
    c.element.name ||
    c.element.dataTestId ||
    c.element.ariaLabel ||
    (c.element.text || "").slice(0, 24) ||
    tag;
  return `<${tag}> ${label}`;
}

async function removeCapture(idx) {
  captures.splice(idx, 1);
  if (activeIndex >= captures.length) activeIndex = Math.max(0, captures.length - 1);
  await chrome.storage.local.set({ [CAPTURES_KEY]: captures });
  if (captures.length === 0) {
    resetResults();
    showCompact();
    return;
  }
  renderCapture(captures[activeIndex]);
  renderCapturesList();
}

/* ---------------- Combined POM generation ----------------
 * Generated inline (mirrors codeGenerator.js logic) since the
 * popup runs in extension context and can't import content scripts.
 */
function generateCombinedPom() {
  if (!captures.length) return "// No elements captured yet";
  const first = captures[0];
  const className = derivePageName(first.element);

  const seen = new Map();
  const enriched = captures.map((c) => {
    let name = variableName(c.element);
    if (seen.has(name)) {
      const n = seen.get(name) + 1;
      seen.set(name, n);
      name = `${name}${n}`;
    } else {
      seen.set(name, 1);
    }
    return { ...c, fieldName: name };
  });

  const fieldLines = enriched.map((c) => {
    const fn = c.fieldName;
    if (c.isList && c.listLocator) {
      return `    private final By ${fn} = ${byLiteral(c.listLocator.type, c.listLocator.value)};`;
    }
    if (!c.best || !c.best.value) return `    // ${fn}: no locator`;
    return `    private final By ${fn} = ${byLiteral(c.best.type, c.best.value)};`;
  });

  const methodBlocks = enriched.map(pomMethodFor);

  return [
    `import java.util.List;`,
    `import org.openqa.selenium.By;`,
    `import org.openqa.selenium.SearchContext;`,
    `import org.openqa.selenium.WebDriver;`,
    `import org.openqa.selenium.WebElement;`,
    `import org.openqa.selenium.support.ui.Select;`,
    ``,
    `public class ${className} {`,
    ``,
    `    private final WebDriver driver;`,
    ``,
    `    public ${className}(WebDriver driver) {`,
    `        this.driver = driver;`,
    `    }`,
    ``,
    fieldLines.join("\n"),
    ``,
    methodBlocks.join("\n\n"),
    `}`,
  ].join("\n");
}

function frameEnterLines(chain) {
  if (!Array.isArray(chain) || !chain.length) return [];
  const lines = ["        driver.switchTo().defaultContent();"];
  chain.forEach((f, i) => {
    if (f.resolved && f.best && f.best.value) {
      lines.push(`        driver.switchTo().frame(driver.findElement(${byLiteral(f.best.type, f.best.value)}));`);
    } else {
      lines.push(`        // driver.switchTo().frame(/* unresolved frame ${i + 1} */);`);
    }
  });
  return lines;
}
function frameLeaveLines(chain) {
  if (!Array.isArray(chain) || !chain.length) return [];
  return ["        driver.switchTo().defaultContent();"];
}

function shadowEnterLines(chain) {
  if (!Array.isArray(chain) || !chain.length) return { lines: [], scope: "driver" };
  const lines = [];
  let scope = "driver";
  chain.forEach((h, i) => {
    const hostVar = `host${i + 1}`;
    const ctxVar = `shadow${i + 1}`;
    if (h.resolved && h.best && h.best.value) {
      const inDoc = i === 0;
      const expr = inDoc
        ? byLiteral(h.best.type, h.best.value)
        : `By.cssSelector("${escapeJavaStr(h.locators?.css || h.best.value)}")`;
      lines.push(`        WebElement ${hostVar} = ${scope}.findElement(${expr});`);
      lines.push(`        SearchContext ${ctxVar} = ${hostVar}.getShadowRoot();`);
      scope = ctxVar;
    } else {
      lines.push(`        // SearchContext ${ctxVar} = /* closed shadow root: ${h.note || "unresolved"} */;`);
    }
  });
  return { lines, scope };
}

function escapeJavaStr(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
}

function pomMethodFor(c) {
  const fn = c.fieldName;
  const cap0 = cap(fn);
  const tag = (c.element.tag || "").toLowerCase();
  const enterF = frameEnterLines(c.frameChain);
  const leaveF = frameLeaveLines(c.frameChain);
  const { lines: enterS, scope } = shadowEnterLines(c.shadowChain);

  if (c.isList) {
    return [
      `    public List<WebElement> get${cap0}() {`,
      ...enterF, ...enterS,
      `        List<WebElement> result = ${scope}.findElements(${fn});`,
      ...leaveF,
      `        return result;`,
      `    }`,
      ``,
      `    public int ${fn}Count() {`,
      ...enterF, ...enterS,
      `        int n = ${scope}.findElements(${fn}).size();`,
      ...leaveF,
      `        return n;`,
      `    }`,
      ``,
      `    public WebElement get${cap0}At(int index) {`,
      ...enterF, ...enterS,
      `        WebElement el = ${scope}.findElements(${fn}).get(index);`,
      ...leaveF,
      `        return el;`,
      `    }`,
    ].join("\n");
  }
  if (tag === "input" || tag === "textarea") {
    return [
      `    public void set${cap0}(String value) {`,
      ...enterF, ...enterS,
      `        WebElement el = ${scope}.findElement(${fn});`,
      `        el.clear();`,
      `        el.sendKeys(value);`,
      ...leaveF,
      `    }`,
      ``,
      `    public String get${cap0}Value() {`,
      ...enterF, ...enterS,
      `        String v = ${scope}.findElement(${fn}).getAttribute("value");`,
      ...leaveF,
      `        return v;`,
      `    }`,
    ].join("\n");
  }
  if (tag === "select") {
    return [
      `    public void select${cap0}(String visibleText) {`,
      ...enterF, ...enterS,
      `        new Select(${scope}.findElement(${fn})).selectByVisibleText(visibleText);`,
      ...leaveF,
      `    }`,
    ].join("\n");
  }
  return [
    `    public void click${cap0}() {`,
    ...enterF, ...enterS,
    `        ${scope}.findElement(${fn}).click();`,
    ...leaveF,
    `    }`,
    ``,
    `    public boolean is${cap0}Displayed() {`,
    ...enterF, ...enterS,
    `        boolean v = ${scope}.findElement(${fn}).isDisplayed();`,
    ...leaveF,
    `        return v;`,
    `    }`,
  ].join("\n");
}

function variableName(element) {
  const tag = (element.tag || "el").toLowerCase();
  const SUFFIX = {
    input: "Input", textarea: "TextArea", select: "Dropdown",
    button: "Button", a: "Link", label: "Label",
    li: "Item", tr: "Row", td: "Cell", th: "HeaderCell",
  };
  const suffix = SUFFIX[tag] || "Element";
  let base = element.id || element.name || element.dataTestId || element.ariaLabel || element.placeholder || element.text || tag;
  base = String(base).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!base) base = tag;
  const parts = base.split(/\s+/).slice(0, 4);
  const camel = parts.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join("");
  if (camel.toLowerCase().endsWith(suffix.toLowerCase())) return camel;
  return camel + suffix;
}

function byLiteral(type, value) {
  const safe = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
  switch (type) {
    case "id":          return `By.id("${safe}")`;
    case "name":        return `By.name("${safe}")`;
    case "cssSelector": return `By.cssSelector("${safe}")`;
    case "className":   return `By.className("${safe}")`;
    case "xpath":       return `By.xpath("${safe}")`;
    case "linkText":    return `By.linkText("${safe}")`;
    default:            return `By.cssSelector("${safe}")`;
  }
}

function derivePageName(element) {
  const host = (location && location.hostname) || "Page";
  const path = (location && location.pathname) || "";
  const slug = (path.split("/").filter(Boolean).pop() || host).replace(/[^a-zA-Z0-9]/g, "");
  const base = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Sample";
  return `${base}Page`;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ---------------- Main render ---------------- */
function renderResult(data) {
  showExpanded();
  setStatus("result");

  if (data.promoted) {
    setHint(`Auto-promoted <b>&lt;${data.originalTag}&gt;</b> → <b>&lt;${data.element.tag}&gt;</b>. <b>${KEY.ALT}</b>+click for exact node.`);
  } else if (data.originalTag && data.originalTag !== data.element.tag) {
    // ALT was held — exact node captured without promotion. Confirm to user.
    setHint(`Exact node captured: <b>&lt;${data.element.tag}&gt;</b> (<b>${KEY.ALT}</b> held).`);
  } else if (currentMode === "multi") {
    setHint(`<b>${captures.length}</b> element${captures.length === 1 ? "" : "s"} captured. POM rebuilds with each click.`);
  } else if (data.isList) {
    setHint(`List of <b>${data.listCount}</b> matching elements detected. See <b>List</b> card.`);
  } else {
    setHint("Element captured. Switch tabs for Java / POM / Element info.");
  }

  renderCapture(data);
  renderCapturesList();

  // Notify any loaded Pro modules so they can refresh their views
  if (typeof proApi !== "undefined" && Array.isArray(proApi._renderHooks)) {
    proApi._renderHooks.forEach((fn) => { try { fn(data); } catch (_) {} });
  }
}

function resetResults() {
  [
    els.locId, els.locName, els.locCss, els.locXpath, els.locRxpath, els.locBest,
    els.locList, els.javaListCode,
    els.javaCode, els.pomCode,
    els.metaTag, els.metaId, els.metaName, els.metaClass, els.metaType, els.metaText,
  ].forEach((n) => { if (n) n.textContent = "—"; });
  els.listCard?.classList.add("hidden");
  els.javaListCard?.classList.add("hidden");
  els.capturesStrip?.classList.add("hidden");
  els.frameCard?.classList.add("hidden");
  els.frameStatusPill?.classList.add("hidden");
  if (els.frameChainList) els.frameChainList.innerHTML = "";
  if (els.frameDepth) els.frameDepth.textContent = "";

  els.shadowCard?.classList.add("hidden");
  els.shadowStatusPill?.classList.add("hidden");
  if (els.shadowChainList) els.shadowChainList.innerHTML = "";
  if (els.shadowDepth) els.shadowDepth.textContent = "";
}

/* ---------------- Live messages ----------------
 * background.js owns the storage writes (so captures survive
 * popup-closed inspect sessions). Popup just listens to runtime
 * messages for UI state changes and to storage.onChanged for
 * fresh captures.
 */
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === "INSPECT_STOPPED") {
    if (els.startBtn) els.startBtn.disabled = false;
    if (els.stopBtn) els.stopBtn.disabled = true;
    setStatus(captures.length ? "result" : "idle");
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[CAPTURES_KEY]) {
    const newList = changes[CAPTURES_KEY].newValue;
    if (Array.isArray(newList) && newList.length) {
      captures = newList;
      activeIndex = 0;
      renderResult(captures[0]);
      if (els.startBtn) els.startBtn.disabled = false;
      if (els.stopBtn) els.stopBtn.disabled = true;
    } else {
      captures = [];
      resetResults();
      showCompact();
    }
  }
});

/* ---------------- Onboarding (first run) ---------------- */
async function maybeShowOnboarding() {
  const FIRST_RUN_KEY = "smart_locator_first_run";
  const stored = await chrome.storage.local.get(FIRST_RUN_KEY);
  if (!stored[FIRST_RUN_KEY]) return;

  if (els.onboardShortcut) {
    els.onboardShortcut.textContent = IS_MAC ? "⌘ ⇧ L" : "Ctrl ⇧ L";
  }
  els.onboardBanner?.classList.remove("hidden");
}

els.onboardClose?.addEventListener("click", async () => {
  els.onboardBanner?.classList.add("hidden");
  await chrome.storage.local.set({ smart_locator_first_run: false });
});

/* ===========================================================
   Pro / License — settings modal, upsell, lazy module loader
   =========================================================== */

// Exact LemonSqueezy checkout URL (opened in a new tab via chrome.tabs.create —
// MV3 forbids loading the LemonSqueezy lemon.js script inside the popup).
const PRO_BUY_URL = "https://smartselenium.lemonsqueezy.com/checkout/buy/5c9e7b64-ec4a-4057-8133-42f899fcbc7f";

let proLoaded = false;
let proStatus = { valid: false, tier: null };

// Public surface passed to Pro modules. Read-only from their POV.
const proApi = {
  els,
  IS_MAC,
  KEY,
  showToast,
  PRO_BUY_URL,
  getCaptures: () => captures,
  getActiveCapture: () => captures[activeIndex] || null,
  getActiveIndex: () => activeIndex,
  variableName,           // shared with combined-pom builder
  byLiteral,
  escapeJavaStr,
  sendToTab: async (msg) => {
    const tab = await getActiveTab();
    if (!tab?.id) return null;
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tab.id, msg, (resp) => {
          void chrome.runtime.lastError;
          resolve(resp || null);
        });
      } catch (_) { resolve(null); }
    });
  },
  onCaptureRendered: (fn) => { proApi._renderHooks.push(fn); },
  _renderHooks: [],
};

/* ---------------- License message helpers ---------------- */
function sendBg(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        void chrome.runtime.lastError;
        resolve(resp || null);
      });
    } catch (_) { resolve(null); }
  });
}

async function refreshLicenseUI() {
  const status = await sendBg({ type: "LICENSE_STATUS" });
  const raw = await sendBg({ type: "LICENSE_RAW" });
  proStatus = status || { valid: false };
  const isValid = !!status?.valid;

  // Swap Pro tab state: Unlicensed ↔ Licensed
  els.proUnlicensed?.classList.toggle("hidden", isValid);
  els.proLicensed?.classList.toggle("hidden", !isValid);

  if (isValid) {
    if (els.proActiveDetail) {
      els.proActiveDetail.textContent = status.fromGrace
        ? "Pro features active (offline grace window — will re-validate when online)."
        : "All Pro features unlocked.";
    }
    if (els.proTierChip) els.proTierChip.textContent = (status.tier || "pro").toUpperCase();
    if (els.proKeyDisplay) els.proKeyDisplay.textContent = raw?.key || "—";
    if (els.proExpiresAt) {
      els.proExpiresAt.textContent = status.expiresAt
        ? new Date(status.expiresAt).toLocaleDateString()
        : "Lifetime";
    }
  } else {
    // Surface invalid-key errors inline in the Unlicensed state
    if (els.licenseError) {
      if (status?.reason && status.reason !== "no-license") {
        els.licenseError.textContent = `License invalid: ${humanReason(status.reason)}`;
        els.licenseError.classList.remove("hidden");
      }
    }
    // Pre-fill input from any saved-but-invalid key (rare case)
    if (raw?.key && els.licenseKeyInput && !els.licenseKeyInput.value) {
      els.licenseKeyInput.value = raw.key;
    }
  }

  // Global indicators
  els.proDotNav?.classList.toggle("hidden", !isValid);
  els.proTabPill?.classList.toggle("hidden", isValid);   // hide "Pro" pill on tab when already Pro
  els.playwrightProPill?.classList.toggle("hidden", isValid);
  document.querySelectorAll(".pro-locked .pro-pill").forEach((p) => {
    p.classList.toggle("hidden", isValid);
  });
  if (els.playwrightUpgrade && els.playwrightCode) {
    els.playwrightUpgrade.classList.toggle("hidden", isValid);
    els.playwrightCode.classList.toggle("hidden", !isValid);
  }

  // Lazy-load Pro modules on first valid detection
  if (isValid && !proLoaded) {
    proLoaded = true;
    loadProModules().catch((err) => console.error("Pro load failed:", err));
  }
}

function humanReason(r) {
  switch (r) {
    case "invalid-format":         return "Invalid format";
    case "not-found":              return "Not found";
    case "expired":                return "Expired";
    case "cancelled":              return "Cancelled";
    case "refunded":               return "Refunded";
    case "offline-grace-exceeded": return "Offline too long";
    default:                       return r ? `Error: ${r}` : "Invalid";
  }
}

/* ---------------- Lazy module loader ---------------- */
async function loadProModules() {
  // Only Pro users execute this. Imports use relative paths so Chrome
  // resolves them inside the extension bundle — no web_accessible_resources
  // entry required, no remote code, no page-visible exposure.
  const modules = await Promise.all([
    import("../pro/exportPom.js").catch((e) => ({ _err: e })),
    import("../pro/playwright.js").catch((e) => ({ _err: e })),
    import("../pro/locatorValidator.js").catch((e) => ({ _err: e })),
  ]);
  for (const m of modules) {
    if (m && !m._err && typeof m.init === "function") {
      try { m.init(proApi); }
      catch (err) { console.error("Pro module init failed:", err); }
    } else if (m?._err) {
      console.warn("Pro module skipped:", m._err.message || m._err);
    }
  }
  // Re-render current capture so Pro modules can inject their UI
  const cur = captures[activeIndex];
  if (cur) {
    proApi._renderHooks.forEach((fn) => { try { fn(cur); } catch (_) {} });
  }
}

/* ---------------- Pro tab handlers ---------------- */

// Open Pro tab (e.g. from "Unlock Pro" CTAs on locked features)
function focusProTab() {
  const proTab = document.querySelector('.seg-tab[data-tab="pro"]');
  if (proTab) proTab.click();
  setTimeout(() => els.licenseKeyInput?.focus(), 80);
}

// Buy → open LemonSqueezy checkout in a new browser tab (MV3-safe).
// Never inject lemon.js into the popup — Chrome blocks it under CSP.
els.buyProBtn?.addEventListener("click", () => {
  chrome.tabs.create({ url: PRO_BUY_URL });
});

// Verify license key
els.licenseVerifyBtn?.addEventListener("click", async () => {
  const key = (els.licenseKeyInput?.value || "").trim().toUpperCase();
  if (els.licenseError) { els.licenseError.classList.add("hidden"); els.licenseError.textContent = ""; }
  if (!key) return;

  els.licenseVerifyBtn.disabled = true;
  const original = els.licenseVerifyBtn.textContent;
  els.licenseVerifyBtn.textContent = "Verifying…";

  const res = await sendBg({ type: "LICENSE_SET", key });

  els.licenseVerifyBtn.disabled = false;
  els.licenseVerifyBtn.textContent = original;

  if (res?.valid) {
    showToast("Pro activated");
  } else if (els.licenseError) {
    els.licenseError.textContent = `License invalid: ${humanReason(res?.reason || "unknown")}`;
    els.licenseError.classList.remove("hidden");
  }
  refreshLicenseUI();
});

// Submit on Enter inside the key input
els.licenseKeyInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    els.licenseVerifyBtn?.click();
  }
});

// Refresh license status (force re-validate, ignoring 24h cache)
els.licenseRefreshBtn?.addEventListener("click", async () => {
  els.licenseRefreshBtn.disabled = true;
  await sendBg({ type: "LICENSE_REFRESH" });
  els.licenseRefreshBtn.disabled = false;
  refreshLicenseUI();
  showToast("License refreshed");
});

// Remove license (sign-out)
els.licenseClearBtn?.addEventListener("click", async () => {
  if (!confirm("Remove license from this device?\nPro features will lock until you re-verify.")) return;
  await sendBg({ type: "LICENSE_CLEAR" });
  if (els.licenseKeyInput) els.licenseKeyInput.value = "";
  proLoaded = false;
  refreshLicenseUI();
  showToast("License removed");
});

// Upgrade CTA inside Playwright sub-tab → focus Pro tab
els.playwrightUpgradeBtn?.addEventListener("click", focusProTab);

// Any locked button with data-pro-feature → focus Pro tab
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-pro-feature]");
  if (!t) return;
  if (proStatus.valid) return; // pro module owns the click
  e.preventDefault();
  e.stopPropagation();
  focusProTab();
}, true);

/* ---------------- Java sub-tabs ---------------- */
document.querySelectorAll(".sub-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const sibs = tab.parentElement.querySelectorAll(".sub-tab");
    sibs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const parentPanel = tab.closest(".tab-panel");
    if (!parentPanel) return;
    parentPanel.querySelectorAll(".sub-panel").forEach((p) => p.classList.remove("active"));
    const target = parentPanel.querySelector(`.sub-panel[data-subpanel="${tab.dataset.subtab}"]`);
    if (target) target.classList.add("active");
  });
});

// Auto-format license key as user types (SL-XXXX-XXXX-XXXX)
els.licenseKeyInput?.addEventListener("input", (e) => {
  let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (v.startsWith("SL")) v = v.slice(2);
  let out = "SL";
  if (v.length > 0) out += "-" + v.slice(0, 4);
  if (v.length > 4) out += "-" + v.slice(4, 8);
  if (v.length > 8) out += "-" + v.slice(8, 12);
  e.target.value = out;
});

/* ---------------- Boot ---------------- */
(async function boot() {
  maybeShowOnboarding();
  const stored = await chrome.storage.local.get([STORAGE_KEY, CAPTURES_KEY, MODE_KEY]);
  currentMode = stored[MODE_KEY] || "single";

  // Reflect mode in tabs
  document.querySelectorAll('.seg-tabs[id^="modeTabs"]').forEach((bar) => {
    bar.querySelectorAll(".seg-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.mode === currentMode);
    });
  });
  updateStartLabel();

  if (Array.isArray(stored[CAPTURES_KEY]) && stored[CAPTURES_KEY].length) {
    captures = stored[CAPTURES_KEY];
    activeIndex = 0;
    renderResult(captures[0]);
  } else if (stored[STORAGE_KEY] && stored[STORAGE_KEY].element) {
    captures = [stored[STORAGE_KEY]];
    renderResult(captures[0]);
  } else {
    showCompact();
  }
  // Refresh license status (reads from storage; only hits network when cache stale)
  refreshLicenseUI().catch((err) => console.warn("license init failed", err));
})();
