/**
 * pro/playwright.js
 *
 * Pro feature: Playwright code generator. Outputs TypeScript and
 * Python snippets based on the captured locator + chains.
 *
 * Loaded lazily by popup.js when a valid license is detected.
 *
 * Heuristics:
 *   - Prefers high-quality Playwright locators (getByRole, getByLabel,
 *     getByPlaceholder, getByTestId) over raw CSS/XPath
 *   - Honors iframe chains via frameLocator()
 *   - Honors shadow chains by chaining locator() — Playwright pierces
 *     open shadow roots natively, so no special syntax is needed inside
 *     a single locator chain
 *   - Falls back to page.locator(css) when no semantic locator applies
 */

let api;
let currentLang = "ts";

export function init(_api) {
  api = _api;
  api.onCaptureRendered(onCaptureRendered);

  const sel = api.els.playwrightLang;
  if (sel) {
    sel.addEventListener("change", () => {
      currentLang = sel.value === "py" ? "py" : "ts";
      const cur = api.getActiveCapture();
      if (cur) renderInto(cur);
    });
  }
  // Render now if a capture is already on screen
  const cur = api.getActiveCapture();
  if (cur) renderInto(cur);
}

function onCaptureRendered(capture) {
  renderInto(capture);
}

function renderInto(capture) {
  const el = api.els.playwrightCode;
  if (!el || !capture) return;
  el.textContent = build(capture, currentLang);
}

/* ---------------- Code generation ---------------- */

function build(c, lang) {
  const captures = api.getCaptures() || [];
  if (captures.length <= 1) {
    return buildSingle(c, lang);
  }
  return buildPageObject(captures, lang);
}

function buildSingle(c, lang) {
  if (lang === "py") return buildSinglePy(c);
  return buildSingleTs(c);
}

function buildSingleTs(c) {
  const lines = [
    `import { test, expect } from "@playwright/test";`,
    ``,
    `test("captured element interaction", async ({ page }) => {`,
    `  await page.goto("${escapeJs(c.url || "")}");`,
  ];
  const indent = "  ";
  const { lines: chainLines, locatorExpr } = buildLocatorExpr(c, "page", "ts");
  chainLines.forEach((l) => lines.push(indent + l));
  const action = actionTs(c, locatorExpr);
  lines.push(indent + action);
  lines.push("});");
  return lines.join("\n");
}

function buildSinglePy(c) {
  const lines = [
    `from playwright.sync_api import sync_playwright, expect`,
    ``,
    `def test_captured(page):`,
    `    page.goto("${escapeJs(c.url || "")}")`,
  ];
  const indent = "    ";
  const { lines: chainLines, locatorExpr } = buildLocatorExpr(c, "page", "py");
  chainLines.forEach((l) => lines.push(indent + l));
  const action = actionPy(c, locatorExpr);
  lines.push(indent + action);
  return lines.join("\n");
}

function buildPageObject(captures, lang) {
  if (lang === "py") return buildPageObjectPy(captures);
  return buildPageObjectTs(captures);
}

function buildPageObjectTs(captures) {
  const className = derivePageClass(captures[0]);
  const seen = new Map();
  const enriched = captures.map((c) => ({ ...c, fieldName: uniqueName(seen, api.variableName(c.element)) }));

  const lines = [
    `import { Locator, Page, FrameLocator, expect } from "@playwright/test";`,
    ``,
    `export class ${className} {`,
    `  readonly page: Page;`,
    ``,
    `  constructor(page: Page) {`,
    `    this.page = page;`,
    `  }`,
    ``,
  ];

  enriched.forEach((c) => {
    const { lines: chainLines, locatorExpr } = buildLocatorExpr(c, "this.page", "ts");
    if (chainLines.length) {
      lines.push(`  get ${c.fieldName}(): Locator {`);
      chainLines.forEach((l) => lines.push("    " + l));
      lines.push(`    return ${locatorExpr};`);
      lines.push(`  }`);
      lines.push(``);
    } else {
      lines.push(`  readonly ${c.fieldName}: Locator = ${locatorExpr.replace(/^this\.page/, "this.page")};`);
      lines.push(``);
    }
  });

  // Action helpers per capture
  enriched.forEach((c) => {
    const method = actionMethodTs(c);
    if (method) lines.push(method);
  });

  lines.push(`}`);
  return lines.join("\n");
}

function buildPageObjectPy(captures) {
  const className = derivePageClass(captures[0]);
  const seen = new Map();
  const enriched = captures.map((c) => ({ ...c, fieldName: snake(uniqueName(seen, api.variableName(c.element))) }));

  const lines = [
    `from playwright.sync_api import Page, Locator, FrameLocator, expect`,
    ``,
    `class ${className}:`,
    `    def __init__(self, page: Page):`,
    `        self.page = page`,
    ``,
  ];

  enriched.forEach((c) => {
    const { lines: chainLines, locatorExpr } = buildLocatorExpr(c, "self.page", "py");
    lines.push(`    @property`);
    lines.push(`    def ${c.fieldName}(self) -> Locator:`);
    chainLines.forEach((l) => lines.push("        " + l));
    lines.push(`        return ${locatorExpr}`);
    lines.push(``);
  });

  enriched.forEach((c) => {
    const method = actionMethodPy(c);
    if (method) lines.push(method);
  });

  return lines.join("\n");
}

/* ---------------- Locator expression builder ---------------- */
/**
 * Returns { lines, locatorExpr }. `lines` are setup lines (e.g. frame
 * locator declarations). `locatorExpr` is the final expression you call
 * actions on, e.g. `frame.locator("button.submit")`.
 */
function buildLocatorExpr(c, pageVar, lang) {
  const lines = [];
  let scope = pageVar;

  // iframe chain via frameLocator()
  if (Array.isArray(c.frameChain) && c.frameChain.length) {
    c.frameChain.forEach((f, i) => {
      if (f.resolved && f.best && f.best.value) {
        const sel = quote(plainSelector(f.best.type, f.best.value), lang);
        if (lang === "ts") {
          lines.push(`const frame${i + 1}: FrameLocator = ${scope}.frameLocator(${sel});`);
        } else {
          lines.push(`frame${i + 1} = ${scope}.frame_locator(${sel})`);
        }
        scope = `frame${i + 1}`;
      } else {
        lines.push(commentLine(`unresolved frame ${i + 1}`, lang));
      }
    });
  }

  // Shadow chain — Playwright pierces shadow boundaries natively, so we
  // can just chain locator() down through hosts. Each host is a CSS
  // selector since XPath isn't valid inside open shadow in Playwright either.
  if (Array.isArray(c.shadowChain) && c.shadowChain.length) {
    c.shadowChain.forEach((h, i) => {
      if (h.resolved && h.best && h.best.value) {
        const css = h.locators?.css || (h.best.type === "id" ? `#${h.best.value}` : h.best.value);
        scope = lang === "ts"
          ? `${scope}.locator(${quote(css, lang)})`
          : `${scope}.locator(${quote(css, lang)})`;
      } else {
        lines.push(commentLine(`closed shadow root ${i + 1} — manual`, lang));
      }
    });
  }

  // Target locator — prefer semantic Playwright locator
  const semantic = semanticLocator(c.element, scope, lang);
  if (semantic) {
    return { lines, locatorExpr: semantic };
  }

  // Fallback: best locator from our existing pipeline
  const best = c.isList && c.listLocator ? c.listLocator : c.best;
  if (!best || !best.value) {
    return { lines, locatorExpr: `${scope}.locator(${quote("body", lang)})` };
  }
  const sel = plainSelector(best.type, best.value);
  // For XPath, Playwright accepts an `xpath=...` prefix or `//` direct
  const arg = best.type === "xpath" ? `${sel}` : sel;
  return { lines, locatorExpr: `${scope}.locator(${quote(arg, lang)})` };
}

function semanticLocator(element, scope, lang) {
  if (!element) return null;
  const tag = (element.tag || "").toLowerCase();
  const role = element.role;
  const aria = element.ariaLabel;
  const placeholder = element.placeholder;
  const dataTestId = element.dataTestId;
  const text = (element.text || "").trim();

  // Test IDs — most stable
  if (dataTestId) {
    return `${scope}.getByTestId(${quote(dataTestId, lang)})`;
  }
  // aria-label
  if (aria) {
    return `${scope}.getByLabel(${quote(aria, lang)})`;
  }
  // placeholder
  if (placeholder) {
    return `${scope}.getByPlaceholder(${quote(placeholder, lang)})`;
  }
  // Buttons / links with short text
  if ((tag === "button" || tag === "a") && text && text.length <= 60) {
    const r = tag === "a" ? "link" : "button";
    return `${scope}.getByRole(${quote(r, lang)}, { name: ${quote(text, lang)} })`
      .replace("{ name:", lang === "py" ? "name=" : "{ name:")
      .replace(" }", lang === "py" ? "" : " }")
      .replace(", name=", lang === "py" ? ", name=" : ", name:")
      // Python uses `, name=...` without braces
      || null;
  }
  return null;
}

/* ---------------- Actions ---------------- */
function actionTs(c, expr) {
  const tag = (c.element.tag || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return `await ${expr}.fill("YOUR_VALUE");`;
  if (tag === "select") return `await ${expr}.selectOption("YOUR_OPTION");`;
  return `await ${expr}.click();`;
}
function actionPy(c, expr) {
  const tag = (c.element.tag || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return `${expr}.fill("YOUR_VALUE")`;
  if (tag === "select") return `${expr}.select_option("YOUR_OPTION")`;
  return `${expr}.click()`;
}

function actionMethodTs(c) {
  const tag = (c.element.tag || "").toLowerCase();
  const fn = c.fieldName;
  const cap = fn.charAt(0).toUpperCase() + fn.slice(1);
  if (tag === "input" || tag === "textarea") {
    return [
      `  async set${cap}(value: string) {`,
      `    await this.${fn}.fill(value);`,
      `  }`,
      ``,
    ].join("\n");
  }
  if (tag === "select") {
    return [
      `  async select${cap}(option: string) {`,
      `    await this.${fn}.selectOption(option);`,
      `  }`,
      ``,
    ].join("\n");
  }
  if (c.isList) {
    return [
      `  async ${fn}Count(): Promise<number> {`,
      `    return await this.${fn}.count();`,
      `  }`,
      ``,
    ].join("\n");
  }
  return [
    `  async click${cap}() {`,
    `    await this.${fn}.click();`,
    `  }`,
    ``,
  ].join("\n");
}

function actionMethodPy(c) {
  const tag = (c.element.tag || "").toLowerCase();
  const fn = c.fieldName;
  if (tag === "input" || tag === "textarea") {
    return [
      `    def set_${fn}(self, value: str) -> None:`,
      `        self.${fn}.fill(value)`,
      ``,
    ].join("\n");
  }
  if (tag === "select") {
    return [
      `    def select_${fn}(self, option: str) -> None:`,
      `        self.${fn}.select_option(option)`,
      ``,
    ].join("\n");
  }
  if (c.isList) {
    return [
      `    def ${fn}_count(self) -> int:`,
      `        return self.${fn}.count()`,
      ``,
    ].join("\n");
  }
  return [
    `    def click_${fn}(self) -> None:`,
    `        self.${fn}.click()`,
    ``,
  ].join("\n");
}

/* ---------------- Helpers ---------------- */
function plainSelector(type, value) {
  switch (type) {
    case "id":          return `#${value}`;
    case "name":        return `[name="${value}"]`;
    case "className":   return `.${String(value).split(/\s+/).join(".")}`;
    case "xpath":       return value; // Playwright accepts // directly
    default:            return value;
  }
}

function quote(s, lang) {
  const str = String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${str}"`;
}

function commentLine(text, lang) {
  return lang === "ts" ? `// ${text}` : `# ${text}`;
}

function escapeJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function uniqueName(seen, name) {
  if (seen.has(name)) {
    const n = seen.get(name) + 1;
    seen.set(name, n);
    return `${name}${n}`;
  }
  seen.set(name, 1);
  return name;
}

function snake(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function derivePageClass(c) {
  const host = (c.url ? new URL(c.url).hostname : "Page").replace(/[^a-zA-Z0-9]/g, "");
  const path = c.url ? new URL(c.url).pathname : "";
  const slug = (path.split("/").filter(Boolean).pop() || host).replace(/[^a-zA-Z0-9]/g, "");
  const base = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Sample";
  return `${base}Page`;
}
