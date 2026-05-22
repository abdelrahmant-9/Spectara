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

  // ---------- Frame identity ----------
  const IS_TOP = (() => {
    try { return window === window.top; } catch (_) { return false; }
  })();
  const FRAME_TOKEN = (() => {
    if (window.__SL_FRAME_TOKEN__) return window.__SL_FRAME_TOKEN__;
    const t = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.__SL_FRAME_TOKEN__ = t;
    return t;
  })();
  const FRAME_MAX_DEPTH = 10;   // hard cap to defend against deep nesting
  const FRAME_HEARTBEAT_MS = 3000;
  const FRAME_TTL_MS = 5 * 60 * 1000;

  // Top-frame only: registry of known subframes
  // key: frameToken, value: { contentWindow, url, lastSeen }
  const frameMap = IS_TOP ? new Map() : null;

  let inspecting = false;
  let lastHovered = null;
  let overlay = null;
  let panel = null;
  let panelShadow = null;
  let inspectMode = "single"; // "single" | "multi"
  let captureCount = 0;
  let paused = false;

  // OS detection for keybinding labels
  const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || ""
  );
  const KEY = {
    ALT:    IS_MAC ? "⌥ Option" : "Alt",
    ALT_S:  IS_MAC ? "⌥"        : "Alt",
    ESC:    "Esc",
    PAUSE:  "P",
    CMD:    IS_MAC ? "⌘"        : "Ctrl",
  };

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
      /* Panel itself lives in Shadow DOM — only need a hard cursor reset
         so the crosshair from inspect mode never appears over it. */
      #${PANEL_ID}, #${PANEL_ID} * { cursor: auto !important; }
    `;
    document.documentElement.appendChild(style);
  }

  /**
   * Floating panel rendered inside Shadow DOM for full style + event
   * isolation. Page CSS (including our own inspect crosshair) cannot
   * bleed in, and document-level event blockers cannot suppress
   * button clicks — the host id is excluded by our panel check.
   */
  function createPanel() {
    if (panel) return panel;

    const host = document.createElement("div");
    host.id = PANEL_ID;
    host.style.cssText = [
      "all: initial",
      "position: fixed",
      "top: 0",
      "right: 0",
      "width: auto",
      "height: auto",
      "z-index: 2147483647",
      "pointer-events: none",
    ].join(";");

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .panel {
          position: fixed;
          top: 16px;
          right: 16px;
          min-width: 260px;
          padding: 10px 12px;
          background: rgba(28, 28, 30, 0.78);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          backdrop-filter: blur(30px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          color: #f5f5f7;
          font: 13px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
          box-shadow: 0 10px 40px rgba(0,0,0,0.42);
          display: flex;
          align-items: center;
          gap: 10px;
          pointer-events: auto;
          user-select: none;
          cursor: default;
          animation: in 0.18s ease-out;
        }
        @keyframes in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #30d158;
          box-shadow: 0 0 0 4px rgba(48,209,88,0.18);
          animation: pulse 1.2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(48,209,88,0.18); }
          50%     { box-shadow: 0 0 0 7px rgba(48,209,88,0.08); }
        }
        .txt { flex: 1; font-weight: 500; min-width: 0; }
        .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .mode { font-weight: 600; }
        .count { font-size: 11px; color: #0a84ff; font-weight: 600; }
        .hint { font-size: 11px; color: rgba(245,245,247,0.55); font-weight: 400; margin-top: 2px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
        .kbd {
          display: inline-flex;
          align-items: center;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.10);
          color: #f5f5f7;
        }
        button {
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.10);
          color: #f5f5f7;
          font: 600 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
          padding: 9px 14px;
          min-height: 34px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.12s, transform 0.06s;
          flex-shrink: 0;
        }
        button:hover { background: rgba(255,255,255,0.22); }
        button:active { transform: scale(0.96); }
        .stop { background: rgba(255,69,58,0.92); border-color: rgba(255,69,58,0.6); }
        .stop:hover { background: rgba(255,69,58,1); }
        .pause.active { background: rgba(255,159,10,0.92); border-color: rgba(255,159,10,0.6); }
        .pause.active:hover { background: rgba(255,159,10,1); }
      </style>
      <div class="panel">
        <span class="dot"></span>
        <div class="txt">
          <div class="row">
            <span class="mode"></span>
            <span class="count" style="display:none"></span>
          </div>
          <div class="hint"></div>
        </div>
        <button class="pause" type="button" title="Pause inspect (${KEY.PAUSE}) — open menus / hover popups normally">Pause</button>
        <button class="stop" type="button">Stop</button>
      </div>
    `;

    (document.body || document.documentElement).appendChild(host);
    panel = host;
    panelShadow = shadow;

    const pauseBtn = shadow.querySelector(".pause");
    const stopBtn = shadow.querySelector(".stop");

    // Inside Shadow DOM the page can't reach these listeners.
    // Simple bubble-phase click handlers work cleanly.
    pauseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      togglePause();
    });
    stopBtn.addEventListener("click", (e) => {
      e.preventDefault();
      stopInspect(true);
    });

    updatePanelText();
    return panel;
  }

  function removePanel() {
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    panelShadow = null;
  }

  function updatePanelText() {
    if (!panelShadow) return;
    const mode = panelShadow.querySelector(".mode");
    const hint = panelShadow.querySelector(".hint");
    const stopBtn = panelShadow.querySelector(".stop");
    const pauseBtn = panelShadow.querySelector(".pause");

    if (paused) {
      mode.textContent = "Paused · interact freely";
      hint.innerHTML = `Open menus / popups normally · <span class="kbd">${KEY.PAUSE}</span> to resume`;
      pauseBtn.textContent = "Resume";
      pauseBtn.classList.add("active");
    } else {
      mode.textContent = inspectMode === "multi" ? "Multi mode" : "Inspect mode";
      hint.innerHTML = `Click · <span class="kbd">${KEY.ALT_S}</span> exact · <span class="kbd">${KEY.PAUSE}</span> pause · <span class="kbd">${KEY.ESC}</span> cancel`;
      pauseBtn.textContent = "Pause";
      pauseBtn.classList.remove("active");
    }
    stopBtn.textContent = inspectMode === "multi" ? "Done" : "Stop";
  }

  function updatePanelCounter() {
    if (!panelShadow || inspectMode !== "multi") return;
    const c = panelShadow.querySelector(".count");
    if (c) {
      c.textContent = `· ${captureCount} captured`;
      c.style.display = "inline";
    }
  }

  function togglePause() {
    paused = !paused;
    document.documentElement.classList.toggle("smart-locator-paused", paused);
    document.documentElement.classList.toggle("smart-locator-inspect", inspecting && !paused);
    updatePanelText();
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
    if (raw.id === OVERLAY_ID || (raw.closest && raw.closest(`#${OVERLAY_ID}`))) return;
    if (isPanelEvent(e)) return;
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
    if (isPanelEvent(e)) return;

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

      if (IS_TOP) {
        // Top frame: no frame chain needed, send directly.
        payload.frameChain = [];
        try { chrome.runtime.sendMessage({ type: "ELEMENT_CAPTURED", payload }, () => void chrome.runtime.lastError); } catch (_) {}
        captureCount++;
        updatePanelCounter();
      } else {
        // Subframe: bubble to top frame for chain resolution + dispatch.
        const ok = bubbleCaptureToTop(payload);
        if (!ok) {
          // Fallback: relay directly to background. Frame chain will be empty
          // but the locator itself is still useful.
          payload.frameChain = [{ resolved: false, tag: "iframe", url: location.href, note: "Top frame unreachable" }];
          try { chrome.runtime.sendMessage({ type: "ELEMENT_CAPTURED", payload }, () => void chrome.runtime.lastError); } catch (_) {}
        }
        // Subframe counter increment happens on top frame after capture relay.
      }
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

  function isPanelEvent(e) {
    // Shadow DOM retargets event.target to the host (#PANEL_ID).
    // Also check composedPath for safety with closed shadow trees.
    const t = e.target;
    if (t && t.id === PANEL_ID) return true;
    if (t && t.closest && t.closest(`#${PANEL_ID}`)) return true;
    const path = (e.composedPath && e.composedPath()) || [];
    for (const n of path) {
      if (n && n.id === PANEL_ID) return true;
    }
    return false;
  }

  function blockEvent(e) {
    if (!inspecting || paused) return;
    if (isPanelEvent(e)) return;
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

  /* ---------- Cross-frame coordination ---------- */
  // Subframes: announce themselves so top frame can map token → iframe DOM element.
  // Sent once on load and again on heartbeat so SPA route changes inside iframes
  // refresh the contentWindow reference.
  function registerWithTop() {
    if (IS_TOP) return;
    const msg = {
      __sl: true,
      type: "FRAME_REGISTER",
      token: FRAME_TOKEN,
      url: location.href,
    };
    try {
      // Bubble through every ancestor until we hit top. Using each parent (rather
      // than only window.top) helps when intermediate frames are also same-origin
      // and might want to enrich routing in the future.
      let w = window;
      let hops = 0;
      while (w !== window.top && hops < FRAME_MAX_DEPTH) {
        w.parent.postMessage(msg, "*");
        w = w.parent;
        hops++;
      }
    } catch (_) {
      // Cross-origin ancestor: postMessage still works on the immediate parent only.
      try { window.parent.postMessage(msg, "*"); } catch (__) {}
    }
  }

  // Subframes: forward a captured payload to the top frame for chain resolution.
  function bubbleCaptureToTop(payload) {
    if (IS_TOP) return false;
    const msg = {
      __sl: true,
      type: "FRAME_CAPTURE",
      token: FRAME_TOKEN,
      url: location.href,
      payload,
    };
    try {
      // We use window.top.postMessage directly. If an intermediate ancestor is
      // cross-origin, this still works because postMessage doesn't require DOM
      // access — only a Window reference.
      window.top.postMessage(msg, "*");
      return true;
    } catch (_) {
      try { window.parent.postMessage(msg, "*"); return true; } catch (__) { return false; }
    }
  }

  // Top frame: listen for child-frame messages.
  if (IS_TOP) {
    window.addEventListener("message", (e) => {
      const m = e.data;
      if (!m || m.__sl !== true) return;

      if (m.type === "FRAME_REGISTER" && m.token && e.source) {
        frameMap.set(m.token, {
          contentWindow: e.source,
          url: m.url || "",
          lastSeen: Date.now(),
        });
        purgeStaleFrames();
        return;
      }

      if (m.type === "FRAME_CAPTURE" && m.token && m.payload) {
        // Refresh registration on capture in case heartbeat missed.
        if (e.source) {
          const existing = frameMap.get(m.token) || {};
          frameMap.set(m.token, {
            contentWindow: e.source,
            url: m.url || existing.url || "",
            lastSeen: Date.now(),
          });
        }
        handleSubframeCapture(m.token, m.payload);
        return;
      }
    });

    // Heartbeat purge so closed iframes don't leak forever.
    setInterval(purgeStaleFrames, FRAME_HEARTBEAT_MS * 2);
  }

  // Subframes: register on load + heartbeat for SPA route changes.
  if (!IS_TOP) {
    registerWithTop();
    setInterval(registerWithTop, FRAME_HEARTBEAT_MS);
  }

  function purgeStaleFrames() {
    if (!IS_TOP || !frameMap) return;
    const cutoff = Date.now() - FRAME_TTL_MS;
    for (const [token, info] of frameMap.entries()) {
      if (info.lastSeen < cutoff) frameMap.delete(token);
    }
  }

  /**
   * Top-frame: given a child-frame token, walk the window-parent chain and
   * resolve each ancestor iframe's DOM element + locator. Returns ordered
   * array from outermost iframe → innermost.
   *
   * Returns null when no portion of the chain can be resolved (e.g. token
   * stale and contentWindow is detached).
   */
  function resolveFrameChain(token) {
    if (!IS_TOP || !frameMap) return null;
    const reg = frameMap.get(token);
    if (!reg || !reg.contentWindow) return null;

    // Collect the window-stack from the leaf frame up to top.
    const winStack = [];
    let w = reg.contentWindow;
    let hops = 0;
    while (w && w !== window && hops < FRAME_MAX_DEPTH) {
      winStack.unshift(w);
      try { w = w.parent; } catch (_) { break; }
      hops++;
    }
    if (!winStack.length) return null;

    const chain = [];
    let currentDoc = document;
    for (const cw of winStack) {
      const iframe = findIframeForWindow(currentDoc, cw);
      if (!iframe) {
        chain.push({
          resolved: false,
          tag: "iframe",
          url: safeUrlOf(cw),
          note: "Unreachable (cross-origin or detached)",
        });
        break;
      }
      const locs = buildLocators(iframe);
      const best = (window.SmartLocator?.priority?.pickBest)
        ? window.SmartLocator.priority.pickBest(locs)
        : { type: "cssSelector", value: locs.css };
      chain.push({
        resolved: true,
        tag: "iframe",
        id: iframe.id || "",
        name: iframe.getAttribute("name") || "",
        src: iframe.getAttribute("src") || "",
        srcdoc: iframe.hasAttribute("srcdoc"),
        url: safeUrlOf(cw),
        locators: locs,
        best,
      });
      try {
        currentDoc = cw.document;
      } catch (_) {
        // Cross-origin descent: subsequent iframes inside cw must be resolved
        // by cw itself; we can't see into it. Capture chain is complete enough
        // because the subframe's content script already produced the element
        // locator from its own DOM.
        break;
      }
    }
    return chain;
  }

  function findIframeForWindow(doc, win) {
    if (!doc || !win) return null;
    let iframes;
    try { iframes = doc.querySelectorAll("iframe, frame"); } catch (_) { return null; }
    for (const f of iframes) {
      try {
        if (f.contentWindow === win) return f;
      } catch (_) { /* cross-origin contentWindow access */ }
    }
    return null;
  }

  function safeUrlOf(win) {
    try { return win.location && win.location.href; } catch (_) { return ""; }
  }

  /**
   * Top-frame: enrich a child-frame's payload with its iframe chain and
   * re-emit the standard ELEMENT_CAPTURED message + regenerate java/pom
   * code so they include switchTo().frame(...) calls.
   */
  function handleSubframeCapture(token, payload) {
    const chain = resolveFrameChain(token);
    payload.frameChain = chain || [];
    payload.fromSubframe = true;

    // Regenerate Java + POM with frame context.
    if (window.SmartLocator?.code?.javaSnippet) {
      payload.javaCode = window.SmartLocator.code.javaSnippet(
        payload.best, payload.element, payload.frameChain
      );
    }
    if (window.SmartLocator?.code?.pomClass) {
      payload.pomCode = window.SmartLocator.code.pomClass(
        payload.element, payload.locators, payload.frameChain
      );
    }
    if (payload.isList && payload.listLocator && window.SmartLocator?.code?.javaListSnippet) {
      payload.javaListCode = window.SmartLocator.code.javaListSnippet(
        payload.listLocator, payload.element, payload.frameChain
      );
    }

    try {
      try { chrome.runtime.sendMessage({ type: "ELEMENT_CAPTURED", payload }, () => void chrome.runtime.lastError); } catch (_) {}
    } catch (err) {
      console.error("[SmartLocator] subframe capture relay failed", err);
    }

    // In multi mode the top frame's panel counter should reflect subframe captures too.
    if (inspecting && inspectMode === "multi") {
      captureCount++;
      updatePanelCounter();
    }
  }

  /* ---------- Lifecycle ---------- */
  function startInspect() {
    if (inspecting) return;
    inspecting = true;
    injectStyle();
    if (IS_TOP) createPanel();   // Only top frame owns the UI
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

    // Only top frame announces INSPECT_STOPPED; subframes are silent peers.
    if (notify && IS_TOP) {
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
