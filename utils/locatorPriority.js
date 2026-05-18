/**
 * locatorPriority.js
 * Picks the most reliable locator from a candidate set.
 *
 * Order:
 *   1. id           (stable, non-dynamic)
 *   2. name         (stable, non-dynamic)
 *   3. css          (shortest, unique)
 *   4. relative xpath
 *   5. absolute xpath (last resort)
 *
 * Exposed on window.SmartLocator.priority:
 *   - pickBest(locators) → { type, value }
 */
(function () {
  "use strict";

  function looksDynamic(value) {
    if (!value) return true;
    if (/^\d+$/.test(value)) return true;
    if (/^[a-f0-9]{8,}$/i.test(value)) return true;
    if (/\d{4,}/.test(value)) return true;
    if (/(^|[-_])(ng|ember|react|sc|css|jsx|tw)-[a-z0-9]+/.test(value)) return true;
    return false;
  }

  function pickBest(loc) {
    if (loc.id && !looksDynamic(loc.id)) {
      return { type: "id", value: loc.id };
    }
    if (loc.name && !looksDynamic(loc.name)) {
      return { type: "name", value: loc.name };
    }
    if (loc.css && !loc.css.includes(":nth-of-type")) {
      return { type: "cssSelector", value: loc.css };
    }
    if (loc.relativeXpath) {
      return { type: "xpath", value: loc.relativeXpath };
    }
    if (loc.xpath) {
      return { type: "xpath", value: loc.xpath };
    }
    return { type: "cssSelector", value: loc.css || "" };
  }

  window.SmartLocator = window.SmartLocator || {};
  window.SmartLocator.priority = { pickBest, looksDynamic };
})();
