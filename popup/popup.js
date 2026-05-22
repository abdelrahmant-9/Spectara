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

  if (tab.url && /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
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

function pomMethodFor(c) {
  const fn = c.fieldName;
  const cap0 = cap(fn);
  const tag = (c.element.tag || "").toLowerCase();

  if (c.isList) {
    return [
      `    public List<WebElement> get${cap0}() {`,
      `        return driver.findElements(${fn});`,
      `    }`,
      ``,
      `    public int ${fn}Count() {`,
      `        return driver.findElements(${fn}).size();`,
      `    }`,
      ``,
      `    public WebElement get${cap0}At(int index) {`,
      `        return driver.findElements(${fn}).get(index);`,
      `    }`,
    ].join("\n");
  }
  if (tag === "input" || tag === "textarea") {
    return [
      `    public void set${cap0}(String value) {`,
      `        WebElement el = driver.findElement(${fn});`,
      `        el.clear();`,
      `        el.sendKeys(value);`,
      `    }`,
      ``,
      `    public String get${cap0}Value() {`,
      `        return driver.findElement(${fn}).getAttribute("value");`,
      `    }`,
    ].join("\n");
  }
  if (tag === "select") {
    return [
      `    public void select${cap0}(String visibleText) {`,
      `        new Select(driver.findElement(${fn})).selectByVisibleText(visibleText);`,
      `    }`,
    ].join("\n");
  }
  return [
    `    public void click${cap0}() {`,
    `        driver.findElement(${fn}).click();`,
    `    }`,
    ``,
    `    public boolean is${cap0}Displayed() {`,
    `        return driver.findElement(${fn}).isDisplayed();`,
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
  } else if (currentMode === "multi") {
    setHint(`<b>${captures.length}</b> element${captures.length === 1 ? "" : "s"} captured. POM rebuilds with each click.`);
  } else if (data.isList) {
    setHint(`List of <b>${data.listCount}</b> matching elements detected. See <b>List</b> card.`);
  } else {
    setHint("Element captured. Switch tabs for Java / POM / Element info.");
  }

  renderCapture(data);
  renderCapturesList();
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
}

/* ---------------- Live messages ---------------- */
chrome.runtime.onMessage.addListener(async (msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === "ELEMENT_CAPTURED" && msg.payload) {
    const payload = msg.payload;
    if (payload.mode === "multi") {
      captures.unshift(payload);
      activeIndex = 0;
      await chrome.storage.local.set({ [CAPTURES_KEY]: captures });
    } else {
      captures = [payload];
      activeIndex = 0;
      await chrome.storage.local.set({ [STORAGE_KEY]: payload, [CAPTURES_KEY]: captures });
    }
    renderResult(payload);
    if (els.startBtn) els.startBtn.disabled = false;
    if (els.stopBtn) els.stopBtn.disabled = true;
  }
  if (msg.type === "INSPECT_STOPPED") {
    if (els.startBtn) els.startBtn.disabled = false;
    if (els.stopBtn) els.stopBtn.disabled = true;
    setStatus(captures.length ? "result" : "idle");
  }
});

/* ---------------- Boot ---------------- */
(async function boot() {
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
})();
