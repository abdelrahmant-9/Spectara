/**
 * codeGenerator.js
 * Generate Selenium Java code from element metadata + locators.
 *
 * Exposed on window.SmartLocator.code:
 *   - javaSnippet(best, element)   single-line driver.findElement(...) snippet
 *   - pomClass(element, locators)  full Page Object class string
 *   - variableName(element)        smart variable name (e.g. emailInput)
 */
(function () {
  "use strict";

  const ACTION_TAGS = {
    input: "Input",
    textarea: "TextArea",
    select: "Dropdown",
    button: "Button",
    a: "Link",
    label: "Label",
    img: "Image",
    form: "Form",
    div: "Container",
    span: "Text",
    p: "Text",
    h1: "Heading", h2: "Heading", h3: "Heading", h4: "Heading", h5: "Heading", h6: "Heading",
    li: "Item",
    ul: "List", ol: "List",
    table: "Table",
    tr: "Row", td: "Cell", th: "HeaderCell",
  };

  function escapeJava(value) {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, " ");
  }

  function byCall(type, value) {
    const safe = escapeJava(value);
    switch (type) {
      case "id":           return `By.id("${safe}")`;
      case "name":         return `By.name("${safe}")`;
      case "cssSelector":  return `By.cssSelector("${safe}")`;
      case "className":    return `By.className("${safe}")`;
      case "xpath":        return `By.xpath("${safe}")`;
      case "linkText":     return `By.linkText("${safe}")`;
      default:             return `By.cssSelector("${safe}")`;
    }
  }

  function variableName(element) {
    const tag = (element.tag || "el").toLowerCase();
    const suffix = ACTION_TAGS[tag] || "Element";

    let base =
      element.id ||
      element.name ||
      element.dataTestId ||
      element.ariaLabel ||
      element.placeholder ||
      element.text ||
      tag;

    base = String(base).trim().toLowerCase();
    base = base.replace(/[^a-z0-9]+/g, " ").trim();
    if (!base) base = tag;

    const parts = base.split(/\s+/).slice(0, 4);
    const camel = parts
      .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join("");

    if (camel.toLowerCase().endsWith(suffix.toLowerCase())) return camel;
    return camel + suffix;
  }

  function javaSnippet(best, element) {
    if (!best || !best.value) return "// No locator available";
    const varName = variableName(element);
    const tag = (element.tag || "").toLowerCase();
    const call = byCall(best.type, best.value);

    const lines = [];
    lines.push(`// ${tag.toUpperCase()} — ${best.type}`);
    lines.push(`WebElement ${varName} = driver.findElement(${call});`);

    if (tag === "input" || tag === "textarea") {
      lines.push(`${varName}.sendKeys("YOUR_VALUE");`);
    } else if (tag === "select") {
      lines.push(`new Select(${varName}).selectByVisibleText("YOUR_OPTION");`);
    } else if (tag === "a" || tag === "button" || /click/i.test(element.text || "")) {
      lines.push(`${varName}.click();`);
    } else {
      lines.push(`${varName}.click();`);
    }
    return lines.join("\n");
  }

  function pomClass(element, locators) {
    const className = derivePageName(element);
    const fieldName = variableName(element);

    const fields = [];
    if (locators.id && !looksDynamic(locators.id))
      fields.push(`    private final By ${fieldName} = By.id("${escapeJava(locators.id)}");`);
    if (locators.name && !looksDynamic(locators.name))
      fields.push(`    private final By ${fieldName}ByName = By.name("${escapeJava(locators.name)}");`);
    if (locators.css)
      fields.push(`    private final By ${fieldName}ByCss = By.cssSelector("${escapeJava(locators.css)}");`);
    if (locators.relativeXpath)
      fields.push(`    private final By ${fieldName}ByXpath = By.xpath("${escapeJava(locators.relativeXpath)}");`);

    const action = pomAction(element, fieldName);

    return [
      `import org.openqa.selenium.By;`,
      `import org.openqa.selenium.WebDriver;`,
      `import org.openqa.selenium.WebElement;`,
      ``,
      `public class ${className} {`,
      ``,
      `    private final WebDriver driver;`,
      ``,
      `    public ${className}(WebDriver driver) {`,
      `        this.driver = driver;`,
      `    }`,
      ``,
      fields.join("\n"),
      ``,
      action,
      `}`,
    ].join("\n");
  }

  function pomAction(element, fieldName) {
    const tag = (element.tag || "").toLowerCase();
    const methodSuffix = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    if (tag === "input" || tag === "textarea") {
      return [
        `    public ${cap(fieldName)}Page set${methodSuffix}(String value) {`,
        `        WebElement el = driver.findElement(${fieldName});`,
        `        el.clear();`,
        `        el.sendKeys(value);`,
        `        return this;`,
        `    }`,
      ].join("\n");
    }
    if (tag === "select") {
      return [
        `    public void select${methodSuffix}(String visibleText) {`,
        `        new org.openqa.selenium.support.ui.Select(driver.findElement(${fieldName}))`,
        `            .selectByVisibleText(visibleText);`,
        `    }`,
      ].join("\n");
    }
    return [
      `    public void click${methodSuffix}() {`,
      `        driver.findElement(${fieldName}).click();`,
      `    }`,
    ].join("\n");
  }

  function derivePageName(element) {
    const host = (location && location.hostname) || "Page";
    const path = (location && location.pathname) || "";
    const slug = (path.split("/").filter(Boolean).pop() || host).replace(/[^a-zA-Z0-9]/g, "");
    const base = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Sample";
    return `${base}Page`;
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function looksDynamic(value) {
    if (!value) return true;
    if (/^\d+$/.test(value)) return true;
    if (/^[a-f0-9]{8,}$/i.test(value)) return true;
    if (/\d{4,}/.test(value)) return true;
    return false;
  }

  window.SmartLocator = window.SmartLocator || {};
  window.SmartLocator.code = { javaSnippet, pomClass, variableName };
})();
