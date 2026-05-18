/**
 * cssGenerator.js
 * Build CSS selectors for any DOM element.
 *
 * Exposed on window.SmartLocator.css:
 *   - shortest(el)     best-effort short unique selector
 *   - full(el)         full path selector
 */
(function () {
  "use strict";

  function escapeCss(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/([^a-zA-Z0-9_\-])/g, "\\$1");
  }

  function looksDynamic(value) {
    if (!value) return true;
    if (/^\d+$/.test(value)) return true;
    if (/^[a-f0-9]{8,}$/i.test(value)) return true;
    if (/\d{4,}/.test(value)) return true;
    if (/(^|[-_])(ng|ember|react|sc|css|jsx|tw)-[a-z0-9]+/.test(value)) return true;
    return false;
  }

  function isUnique(selector, root = document) {
    try {
      return root.querySelectorAll(selector).length === 1;
    } catch (_) {
      return false;
    }
  }

  function shortest(el) {
    if (!el || el.nodeType !== 1) return "";

    if (el.id && !looksDynamic(el.id)) {
      const sel = `#${escapeCss(el.id)}`;
      if (isUnique(sel)) return sel;
    }

    const name = el.getAttribute("name");
    if (name && !looksDynamic(name)) {
      const sel = `${el.tagName.toLowerCase()}[name="${name}"]`;
      if (isUnique(sel)) return sel;
    }

    for (const attr of ["data-testid", "data-test", "data-qa", "data-cy", "aria-label", "placeholder"]) {
      const val = el.getAttribute(attr);
      if (val && !looksDynamic(val)) {
        const sel = `${el.tagName.toLowerCase()}[${attr}="${val}"]`;
        if (isUnique(sel)) return sel;
      }
    }

    const cls = (el.getAttribute("class") || "").trim();
    if (cls) {
      const tokens = cls.split(/\s+/).filter((c) => c && !looksDynamic(c));
      if (tokens.length) {
        const tag = el.tagName.toLowerCase();
        const sel = tag + tokens.map((t) => "." + escapeCss(t)).join("");
        if (isUnique(sel)) return sel;
      }
    }

    return full(el);
  }

  function full(el) {
    if (!el || el.nodeType !== 1) return "";
    const path = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      let part = node.tagName.toLowerCase();
      if (node.id && !looksDynamic(node.id)) {
        part = `${part}#${escapeCss(node.id)}`;
        path.unshift(part);
        break;
      } else {
        const idx = nthOfType(node);
        part = `${part}:nth-of-type(${idx})`;
        path.unshift(part);
      }
      node = node.parentElement;
    }
    return path.join(" > ");
  }

  function nthOfType(el) {
    let i = 1;
    let sib = el.previousElementSibling;
    while (sib) {
      if (sib.tagName === el.tagName) i++;
      sib = sib.previousElementSibling;
    }
    return i;
  }

  window.SmartLocator = window.SmartLocator || {};
  window.SmartLocator.css = { shortest, full };
})();
