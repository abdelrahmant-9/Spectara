/**
 * xpathGenerator.js
 * Build absolute and relative XPath expressions for any DOM element.
 *
 * Exposed on window.SmartLocator.xpath:
 *   - absolute(el)        full positional XPath
 *   - relative(el)        shortest attribute-based XPath
 *   - byAttribute(el)     attribute XPath if a stable attribute exists
 *   - byText(el)          XPath using normalized text (links/buttons)
 */
(function () {
  "use strict";

  const STABLE_ATTRS = [
    "id",
    "name",
    "data-testid",
    "data-test",
    "data-qa",
    "data-cy",
    "aria-label",
    "placeholder",
    "title",
    "for",
    "role",
  ];

  function escapeXpathString(value) {
    if (value == null) return "''";
    if (!value.includes("'")) return `'${value}'`;
    if (!value.includes('"')) return `"${value}"`;
    const parts = value.split("'");
    return "concat(" + parts.map((p, i) => `'${p}'${i < parts.length - 1 ? ",\"'\"," : ""}`).join("") + ")";
  }

  function getIndex(el) {
    let i = 1;
    let sib = el.previousElementSibling;
    while (sib) {
      if (sib.tagName === el.tagName) i++;
      sib = sib.previousElementSibling;
    }
    return i;
  }

  function absolute(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el === document.documentElement) return "/html";
    const segments = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      const tag = node.tagName.toLowerCase();
      const idx = getIndex(node);
      segments.unshift(`${tag}[${idx}]`);
      node = node.parentElement;
    }
    return "/html/" + segments.join("/");
  }

  function byAttribute(el) {
    if (!el || el.nodeType !== 1) return "";
    const tag = el.tagName.toLowerCase();

    if (el.id && !looksDynamic(el.id)) {
      return `//*[@id=${escapeXpathString(el.id)}]`;
    }

    for (const attr of STABLE_ATTRS) {
      if (attr === "id") continue;
      const val = el.getAttribute(attr);
      if (val && !looksDynamic(val)) {
        return `//${tag}[@${attr}=${escapeXpathString(val)}]`;
      }
    }

    const cls = (el.getAttribute("class") || "").trim();
    if (cls) {
      const tokens = cls.split(/\s+/).filter((c) => c && !looksDynamic(c));
      if (tokens.length) {
        const first = tokens[0];
        return `//${tag}[contains(concat(' ', normalize-space(@class), ' '), ' ${first} ')]`;
      }
    }

    return "";
  }

  function byText(el) {
    if (!el || el.nodeType !== 1) return "";
    const tag = el.tagName.toLowerCase();
    if (!/^(a|button|label|h[1-6]|span|p|li)$/i.test(tag)) return "";
    const text = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (!text || text.length > 60) return "";
    return `//${tag}[normalize-space()=${escapeXpathString(text)}]`;
  }

  function relative(el) {
    const a = byAttribute(el);
    if (a) return a;
    const t = byText(el);
    if (t) return t;
    return shortestPositional(el);
  }

  function shortestPositional(el) {
    if (!el || el.nodeType !== 1) return "";
    const segments = [];
    let node = el;
    while (node && node.nodeType === 1) {
      const stable = stableSegment(node);
      if (stable) {
        segments.unshift(stable);
        return "//" + segments.join("/");
      }
      const tag = node.tagName.toLowerCase();
      const idx = getIndex(node);
      segments.unshift(`${tag}[${idx}]`);
      node = node.parentElement;
      if (!node || node === document.documentElement) break;
    }
    return "//" + segments.join("/");
  }

  function stableSegment(node) {
    const tag = node.tagName.toLowerCase();
    if (node.id && !looksDynamic(node.id)) {
      return `*[@id='${node.id}']`;
    }
    for (const attr of STABLE_ATTRS) {
      if (attr === "id") continue;
      const val = node.getAttribute(attr);
      if (val && !looksDynamic(val)) {
        return `${tag}[@${attr}='${val}']`;
      }
    }
    return null;
  }

  function looksDynamic(value) {
    if (!value) return true;
    if (/^\d+$/.test(value)) return true;
    if (/^[a-f0-9]{8,}$/i.test(value)) return true;
    if (/\d{4,}/.test(value)) return true;
    if (/(^|[-_])(ng|ember|react|sc|css|jsx|tw)-[a-z0-9]+/.test(value)) return true;
    return false;
  }

  window.SmartLocator = window.SmartLocator || {};
  window.SmartLocator.xpath = { absolute, relative, byAttribute, byText, looksDynamic };
})();
