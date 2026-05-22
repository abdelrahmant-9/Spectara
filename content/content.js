/**
 * content.js
 * Runs in the page context. Handles inspect lifecycle:
 *   - hover highlight
 *   - click capture
 *   - element metadata + locator extraction
 *   - sends payload to popup via runtime message
 */
(function () {
  "use strict";

  if (window.__SMART_LOCATOR_LOADED__) return;
  window.__SMART_LOCATOR_LOADED__ = true;

  const OVERLAY_ID = "__smart_locator_overlay__";
  const STYLE_ID = "__smart_locator_style__";
  const PANEL_ID = "__smart_locator_panel__";

  let inspecting = false;
  let lastHovered = null;
  let overlay = null;
  let panel = null;
  let inspectMode = "single"; // "single" | "multi"
  let captureCount = 0;
  let paused = false;

  /* ---------- Styles ---------- */
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        border: 2px solid #4f8cff;
        background: rgba(79, 140, 255, 0.12);
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.0);
        transition: all 0.04s linear;
        border-radius: 2px;
      }
      #${OVERLAY_ID}.locked {
        border-color: #2ecc71;
        background: rgba(46, 204, 113, 0.18);
      }
      .__smart_locator_label__ {
        position: absolute;
        top: -22px;
        left: 0;
        background: #4f8cff;
        color: white;
        font: 11px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
      }
      html.smart-locator-inspect, html.smart-locator-inspect * {
        cursor: crosshair !important;
      }
      html.smart-locator-paused, html.smart-locator-paused * {
        cursor: auto !important;
      }
      html.smart-locator-paused #${OVERLAY_ID} { display: none !important; }
      #${PANEL_ID} {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        min-width: 220px;
        padding: 10px 12px;
        background: rgba(28, 28, 30, 0.72);
        backdrop-filter: blur(30px) saturate(180%);
        -webkit-backdrop-filter: blur(30px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        color: #f5f5f7;
        font: 13px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        box-shadow: 0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: __sl_in 0.18s ease-out;
        isolation: isolate;
        pointer-events: auto !important;
        user-select: none;
      }
      #${PANEL_ID} *,
      html.smart-locator-inspect #${PANEL_ID},
      html.smart-locator-inspect #${PANEL_ID} * {
        pointer-events: auto !important;
        cursor: default !important;
      }
      html.smart-locator-inspect #${PANEL_ID} button,
      #${PANEL_ID} button {
        cursor: pointer !important;
      }
      @keyframes __sl_in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      #${PANEL_ID} .__sl_dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #30d158;
        box-shadow: 0 0 0 4px rgba(48,209,88,0.18);
        animation: __sl_pulse 1.2s ease-in-out infinite;
      }
      @keyframes __sl_pulse {
        0%,100% { box-shadow: 0 0 0 4px rgba(48,209,88,0.18); }
        50%     { box-shadow: 0 0 0 7px rgba(48,209,88,0.08); }
      }
      #${PANEL_ID} .__sl_txt { flex: 1; font-weight: 500; }
      #${PANEL_ID} .__sl_hint { font-size: 11px; color: rgba(245,245,247,0.55); font-weight: 400; margin-top: 1px; }
      #${PANEL_ID} .__sl_mode { font-weight: 600; }
      #${PANEL_ID} .__sl_count { font-size: 11px; color: #0a84ff; font-weight: 600; }
      #${PANEL_ID} button {
        position: relative;
        z-index: 1;
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.10);
        color: #f5f5f7;
        font: 600 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        padding: 8px 14px;
        min-height: 32px;
        border-radius: 8px;
        cursor: pointer !important;
        transition: background 0.12s, transform 0.08s;
        -webkit-appearance: none;
        appearance: none;
      }
      #${PANEL_ID} button:active { transform: scale(0.96); }
      #${PANEL_ID} button:hover { background: rgba(255,255,255,0.18); }
      #${PANEL_ID} button.__sl_stop { background: rgba(255,69,58,0.85); border-color: rgba(255,69,58,0.6); }
      #${PANEL_ID} button.__sl_stop:hover { background: rgba(255,69,58,1); }
      #${PANEL_ID} button.__sl_pause.active { background: rgba(255,159,10,0.85); border-color: rgba(255,159,10,0.6); }
      #${PANEL_ID} button.__sl_pause.active:hover { background: rgba(255,159,10,1); }
    `;
    document.documentElement.appendChild(style);
  }

  function createPanel() {
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    const modeLabel = inspectMode === "multi" ? "Multi mode" : "Inspect mode";
    panel.innerHTML = `
      <span class="__sl_dot"></span>
      <div class="__sl_txt">
        <span class="__sl_mode">${modeLabel}</span>
        <span class="__sl_count" style="display:none"></span>
        <div class="__sl_hint">Click · ALT exact · P pause · ESC cancel</div>
      </div>
      <button class="__sl_pause" type="button" title="Pause inspect (P) — let you open menus / hover popups">Pause</button>
      <button class="__sl_stop" type="button">${inspectMode === "multi" ? "Done" : "Stop"}</button>
    `;
    document.documentElement.appendChild(panel);

    const stopBtn = panel.querySelector(".__sl_stop");
    const pauseBtn = panel.querySelector(".__sl_pause");

    // Bind via multiple event types so Mac trackpad + Chrome can't miss
    function bindBtn(btn, fn) {
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        fn();
      };
      btn.addEventListener("click", handler, true);
      btn.addEventListener("mousedown", (e) => {
        // Eat mousedown so document-level blockEvent can't interfere
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);
      btn.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);
    }
    bindBtn(stopBtn, () => stopInspect(true));
    bindBtn(pauseBtn, () => togglePause());

    // Panel itself swallows propagation so document handlers don't fire
    ["click", "mousedown", "mouseup", "mouseover", "mousemove", "pointerdown"].forEach((ev) => {
      panel.addEventListener(ev, (e) => { e.stopPropagation(); }, true);
    });
    return panel;
  }

  function updatePanelCounter() {
    if (!panel || inspectMode !== "multi") return;
    const c = panel.querySelector(".__sl_count");
    if (c) {
      c.textContent = ` · ${captureCount} captured`;
      c.style.display = "inline";
    }
  }

  function togglePause() {
    paused = !paused;
    document.documentElement.classList.toggle("smart-locator-paused", paused);
    document.documentElement.classList.toggle("smart-locator-inspect", inspecting && !paused);
    if (panel) {
      const btn = panel.querySelector(".__sl_pause");
      const mode = panel.querySelector(".__sl_mode");
      const hint = panel.querySelector(".__sl_hint");
      if (btn) {
        btn.textContent = paused ? "Resume" : "Pause";
        btn.classList.toggle("active", paused);
      }
      if (mode) mode.textContent = paused
        ? "Paused · interact freely"
        : (inspectMode === "multi" ? "Multi mode" : "Inspect mode");
      if (hint) hint.textContent = paused
        ? "Open menus / popups normally · P to resume"
        : "Click · ALT exact · P pause · ESC cancel";
    }
  }

  function removePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
  }

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    const label = document.createElement("div");
    label.className = "__smart_locator_label__";
    overlay.appendChild(label);
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function removeOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  function moveOverlayTo(el, locked = false) {
    if (!el) return;
    const ov = createOverlay();
    const rect = el.getBoundingClientRect();
    ov.style.top = rect.top + "px";
    ov.style.left = rect.left + "px";
    ov.style.width = rect.width + "px";
    ov.style.height = rect.height + "px";
    ov.classList.toggle("locked", locked);
    const label = ov.querySelector(".__smart_locator_label__");
    if (label) {
      label.textContent = describeBriefly(el);
    }
  }

  function describeBriefly(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    const cls = (el.getAttribute("class") || "").trim().split(/\s+/)[0];
    if (cls) return `${tag}.${cls}`;
    return tag;
  }

  /* ---------- Promote to actionable ancestor ----------
   * When user clicks decorative children (svg, path, i, icon span)
   * climb up to the nearest interactive/labelled ancestor.
   * Skip promotion if clicked element itself has a stable attribute.
   */
  const NON_ACTIONABLE_TAGS = new Set([
    "svg", "path", "use", "g", "circle", "rect", "polygon", "line", "polyline",
    "i", "em", "strong", "small", "b",
  ]);

  const ACTIONABLE_TAGS = new Set([
    "a", "button", "input", "select", "textarea", "label", "summary",
  ]);

  const STABLE_ATTRS = [
    "id", "name", "data-testid", "data-test", "data-qa", "data-cy",
    "aria-label", "placeholder", "role", "for", "href",
  ];

  function hasStableAttr(el) {
    if (!el || !el.getAttribute) return false;
    for (const a of STABLE_ATTRS) {
      const v = el.getAttribute(a);
      if (v && !looksDynamicLocal(v)) return true;
    }
    return false;
  }

  function looksDynamicLocal(value) {
    if (!value) return true;
    if (/^\d+$/.test(value)) return true;
    if (/^[a-f0-9]{8,}$/i.test(value)) return true;
    if (/\d{4,}/.test(value)) return true;
    if (/(^|[-_])(ng|ember|react|sc|css|jsx|tw)-[a-z0-9]+/.test(value)) return true;
    return false;
  }

  function promoteTarget(el) {
    if (!el || el.nodeType !== 1) return el;
    if (hasStableAttr(el)) return el;

    const tag = el.tagName.toLowerCase();
    const decorative =
      NON_ACTIONABLE_TAGS.has(tag) ||
      (tag === "span" && !el.textContent.trim()) ||
      (tag === "div" && !el.textContent.trim() && el.children.length <= 1);

    if (!decorative) return el;

    let node = el.parentElement;
    let hops = 0;
    while (node && node !== document.documentElement && hops < 6) {
      const t = node.tagName.toLowerCase();
      if (ACTIONABLE_TAGS.has(t)) return node;
      if (hasStableAttr(node)) return node;
      if (node.getAttribute("role") && /button|link|tab|menuitem|checkbox|radio/i.test(node.getAttribute("role"))) {
        return node;
      }
      if (node.onclick || node.getAttribute("onclick")) return node;
      node = node.parentElement;
      hops++;
    }
    return el;
  }

  /* ---------- Element metadata ---------- */
  function extractElement(el) {
    return {
      tag: el.tagName ? el.tagName.toLowerCase() : "",
      id: el.id || "",
      name: el.getAttribute("name") || "",
      className: el.getAttribute("class") || "",
      type: el.getAttribute("type") || "",
      placeholder: el.getAttribute("placeholder") || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      dataTestId: el.getAttribute("data-testid") || el.getAttribute("data-test") || "",
      href: el.getAttribute("href") || "",
      value: el.value != null ? String(el.value).slice(0, 200) : "",
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200),
    };
  }

  function buildLocators(el) {
    const S = window.SmartLocator || {};
    const xp = (S.xpath && S.xpath.absolute) ? S.xpath.absolute(el) : "";
    const rxp = (S.xpath && S.xpath.relative) ? S.xpath.relative(el) : "";
    const css = (S.css && S.css.shortest) ? S.css.shortest(el) : "";

    return {
      id: el.id || "",
      name: el.getAttribute("name") || "",
      css: css || "",
      xpath: xp || "",
      relativeXpath: rxp || "",
    };
  }

  /**
   * Detect if clicked element is part of a sibling list/collection.
   * Returns { isList: bool, count, listLocator: {type,value}, javaListSnippet }
   */
  function detectList(el) {
    if (!el || !el.parentElement) return { isList: false };
    const parent = el.parentElement;
    const tag = el.tagName;
    const cls = (el.getAttribute("class") || "").trim();

    // Strategy 1: same-tag siblings with same class
    const tagSibs = Array.from(parent.children).filter((c) => c.tagName === tag);
    if (tagSibs.length < 2) return { isList: false };

    let listLocator = null;
    let count = tagSibs.length;

    // Try class-based collection
    if (cls) {
      const tokens = cls.split(/\s+/).filter((c) => c && !looksDynamicLocal(c));
      if (tokens.length) {
        const tagL = tag.toLowerCase();
        const sel = tagL + tokens.map((t) => "." + cssEscape(t)).join("");
        try {
          const matches = document.querySelectorAll(sel);
          if (matches.length >= 2 && matches.length === count) {
            listLocator = { type: "cssSelector", value: sel };
            count = matches.length;
          }
        } catch (_) {}
      }
    }

    // Fallback: parent + tag selector
    if (!listLocator) {
      const parentSel = parentSelector(parent);
      if (parentSel) {
        const sel = `${parentSel} > ${tag.toLowerCase()}`;
        try {
          const matches = document.querySelectorAll(sel);
          if (matches.length >= 2) {
            listLocator = { type: "cssSelector", value: sel };
            count = matches.length;
          }
        } catch (_) {}
      }
    }

    if (!listLocator) return { isList: false };

    return { isList: true, count, listLocator };
  }

  function parentSelector(p) {
    if (!p || p.nodeType !== 1) return "";
    if (p.id && !looksDynamicLocal(p.id)) return `#${cssEscape(p.id)}`;
    const cls = (p.getAttribute("class") || "").trim();
    if (cls) {
      const tokens = cls.split(/\s+/).filter((c) => c && !looksDynamicLocal(c));
      if (tokens.length) return p.tagName.toLowerCase() + "." + cssEscape(tokens[0]);
    }
    const dt = p.getAttribute("data-testid") || p.getAttribute("data-test");
    if (dt && !looksDynamicLocal(dt)) return `${p.tagName.toLowerCase()}[data-testid="${dt}"]`;
    return "";
  }

  function cssEscape(v) {
    if (window.CSS && CSS.escape) return CSS.escape(v);
    return String(v).replace(/([^a-zA-Z0-9_\-])/g, "\\$1");
  }

  function buildPayload(el) {
    const element = extractElement(el);
    const locators = buildLocators(el);
    const best = (window.SmartLocator?.priority?.pickBest)
      ? window.SmartLocator.priority.pickBest(locators)
      : { type: "cssSelector", value: locators.css };

    const listInfo = detectList(el);

    const javaCode = window.SmartLocator?.code?.javaSnippet
      ? window.SmartLocator.code.javaSnippet(best, element)
      : "";
    const javaListCode = (listInfo.isList && window.SmartLocator?.code?.javaListSnippet)
      ? window.SmartLocator.code.javaListSnippet(listInfo.listLocator, element)
      : "";
    const pomCode = window.SmartLocator?.code?.pomClass
      ? window.SmartLocator.code.pomClass(element, locators)
      : "";

    return {
      url: location.href,
      capturedAt: new Date().toISOString(),
      element,
      locators,
      best,
      isList: listInfo.isList,
      listLocator: listInfo.listLocator || null,
      listCount: listInfo.count || 0,
      javaCode,
      javaListCode,
      pomCode,
    };
  }

  /* ---------- Event handlers ---------- */
  function onMouseOver(e) {
    if (!inspecting || paused) return;
    const raw = e.target;
    if (!raw) return;
    if (raw.id === OVERLAY_ID || raw.closest(`#${OVERLAY_ID}`)) return;
    if (raw.id === PANEL_ID || raw.closest(`#${PANEL_ID}`)) return;
    const t = promoteTarget(raw);
    lastHovered = t;
    moveOverlayTo(t, false);
  }

  function onMouseMove(e) {
    if (!inspecting || paused || !lastHovered) return;
    moveOverlayTo(lastHovered, false);
  }

  function onClick(e) {
    if (!inspecting) return;

    const raw = e.target;
    if (!raw) return;
    if (raw.id === PANEL_ID || raw.closest(`#${PANEL_ID}`)) return;

    // Paused: let click pass through to the page (open menus, etc.)
    if (paused) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const t = e.altKey ? raw : promoteTarget(raw);

    try {
      moveOverlayTo(t, true);
      const payload = buildPayload(t);
      payload.promoted = (t !== raw);
      payload.originalTag = raw.tagName ? raw.tagName.toLowerCase() : "";
      payload.mode = inspectMode;
      chrome.runtime.sendMessage({ type: "ELEMENT_CAPTURED", payload });
      captureCount++;
      updatePanelCounter();
    } catch (err) {
      console.error("[SmartLocator] capture failed", err);
    }

    if (inspectMode === "single") {
      stopInspect(false);
    } else {
      // Multi mode: keep inspecting, flash overlay green briefly
      setTimeout(() => {
        if (panel) {
          const flash = panel.querySelector(".__sl_dot");
          if (flash) {
            flash.style.background = "#0a84ff";
            setTimeout(() => { flash.style.background = "#30d158"; }, 300);
          }
        }
      }, 0);
    }
  }

  function blockEvent(e) {
    if (!inspecting || paused) return;
    // Don't block events on our floating panel
    const t = e.target;
    if (t && (t.id === PANEL_ID || (t.closest && t.closest(`#${PANEL_ID}`)))) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function onKey(e) {
    if (!inspecting) return;
    if (e.key === "Escape") {
      stopInspect(true);
    } else if (e.key === "p" || e.key === "P") {
      // Don't pause while typing in a text field
      const a = document.activeElement;
      const tag = a && a.tagName ? a.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || (a && a.isContentEditable)) return;
      e.preventDefault();
      togglePause();
    }
  }

  /* ---------- Lifecycle ---------- */
  function startInspect() {
    if (inspecting) return;
    inspecting = true;
    injectStyle();
    createPanel();
    document.documentElement.classList.add("smart-locator-inspect");

    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("mousedown", blockEvent, true);
    document.addEventListener("mouseup", blockEvent, true);
    document.addEventListener("submit", blockEvent, true);
    document.addEventListener("keydown", onKey, true);
  }

  function stopInspect(notify = true) {
    if (!inspecting && !notify) return;
    inspecting = false;
    paused = false;
    document.documentElement.classList.remove("smart-locator-inspect");
    document.documentElement.classList.remove("smart-locator-paused");

    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("mousedown", blockEvent, true);
    document.removeEventListener("mouseup", blockEvent, true);
    document.removeEventListener("submit", blockEvent, true);
    document.removeEventListener("keydown", onKey, true);

    setTimeout(removeOverlay, 600);
    removePanel();

    if (notify) {
      try { chrome.runtime.sendMessage({ type: "INSPECT_STOPPED" }); } catch (_) {}
    }
  }

  /* ---------- Message bridge ---------- */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === "PING") { sendResponse({ ok: true }); return true; }
    if (msg.type === "START_INSPECT") {
      inspectMode = msg.mode === "multi" ? "multi" : "single";
      captureCount = 0;
      startInspect();
      sendResponse({ ok: true });
      return true;
    }
    if (msg.type === "STOP_INSPECT") { stopInspect(true); sendResponse({ ok: true }); return true; }
  });
})();
