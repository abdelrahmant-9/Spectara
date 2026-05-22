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

  /**
   * Emit driver.switchTo().frame(...) lines for each iframe in the chain.
   * Always preceded by defaultContent() so the snippet is idempotent.
   */
  function emitFrameSwitchIn(frameChain) {
    if (!Array.isArray(frameChain) || !frameChain.length) return [];
    const lines = [`// Switch into nested frame chain`, `driver.switchTo().defaultContent();`];
    frameChain.forEach((f, i) => {
      if (f.resolved && f.best && f.best.value) {
        const label = f.id ? `#${f.id}` : (f.name ? `[name=${f.name}]` : `iframe[${i}]`);
        lines.push(`// → frame ${i + 1}: ${label}`);
        lines.push(`driver.switchTo().frame(driver.findElement(${byCall(f.best.type, f.best.value)}));`);
      } else {
        lines.push(`// → frame ${i + 1}: ${f.note || "unresolved — switchTo manually"}`);
        lines.push(`// driver.switchTo().frame(/* TODO: provide locator */);`);
      }
    });
    return lines;
  }

  function emitFrameSwitchOut(frameChain) {
    if (!Array.isArray(frameChain) || !frameChain.length) return [];
    return [`driver.switchTo().defaultContent();`];
  }

  function javaSnippet(best, element, frameChain) {
    if (!best || !best.value) return "// No locator available";
    const varName = variableName(element);
    const tag = (element.tag || "").toLowerCase();
    const call = byCall(best.type, best.value);

    const lines = [];
    lines.push(`// ${tag.toUpperCase()} — ${best.type}`);
    lines.push(...emitFrameSwitchIn(frameChain));
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

    lines.push(...emitFrameSwitchOut(frameChain));
    return lines.join("\n");
  }

  function pomClass(element, locators, frameChain) {
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

    const action = pomAction(element, fieldName, frameChain);

    // Optional frame-chain locator fields for documentation in the POM.
    const frameFields = [];
    if (Array.isArray(frameChain) && frameChain.length) {
      frameChain.forEach((f, i) => {
        if (f.resolved && f.best && f.best.value) {
          frameFields.push(`    // Frame ${i + 1} of ${frameChain.length}`);
          frameFields.push(`    private final By frame${i + 1}Locator = ${byCall(f.best.type, f.best.value)};`);
        } else {
          frameFields.push(`    // Frame ${i + 1}: ${f.note || "unresolved"}`);
        }
      });
    }

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
      ...(frameFields.length ? [frameFields.join("\n"), ``] : []),
      fields.join("\n"),
      ``,
      action,
      `}`,
    ].join("\n");
  }

  function frameSwitchInBody(frameChain, indent) {
    if (!Array.isArray(frameChain) || !frameChain.length) return [];
    const ind = indent || "        ";
    const lines = [`${ind}driver.switchTo().defaultContent();`];
    frameChain.forEach((f, i) => {
      if (f.resolved && f.best && f.best.value) {
        lines.push(`${ind}driver.switchTo().frame(driver.findElement(frame${i + 1}Locator));`);
      } else {
        lines.push(`${ind}// driver.switchTo().frame(/* unresolved frame ${i + 1} */);`);
      }
    });
    return lines;
  }
  function frameSwitchOutBody(frameChain, indent) {
    if (!Array.isArray(frameChain) || !frameChain.length) return [];
    return [`${indent || "        "}driver.switchTo().defaultContent();`];
  }

  function pomAction(element, fieldName, frameChain) {
    const tag = (element.tag || "").toLowerCase();
    const methodSuffix = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const enterFrame = frameSwitchInBody(frameChain);
    const leaveFrame = frameSwitchOutBody(frameChain);

    if (tag === "input" || tag === "textarea") {
      return [
        `    public ${cap(fieldName)}Page set${methodSuffix}(String value) {`,
        ...enterFrame,
        `        WebElement el = driver.findElement(${fieldName});`,
        `        el.clear();`,
        `        el.sendKeys(value);`,
        ...leaveFrame,
        `        return this;`,
        `    }`,
      ].join("\n");
    }
    if (tag === "select") {
      return [
        `    public void select${methodSuffix}(String visibleText) {`,
        ...enterFrame,
        `        new org.openqa.selenium.support.ui.Select(driver.findElement(${fieldName}))`,
        `            .selectByVisibleText(visibleText);`,
        ...leaveFrame,
        `    }`,
      ].join("\n");
    }
    return [
      `    public void click${methodSuffix}() {`,
      ...enterFrame,
      `        driver.findElement(${fieldName}).click();`,
      ...leaveFrame,
      `    }`,
    ].join("\n");
  }

  /**
   * Build a single POM class from multiple captures.
   * captures: [{ element, locators, best, isList, listLocator }, ...]
   */
  function pomClassMulti(captures) {
    if (!captures || !captures.length) return "// No elements captured yet";
    const first = captures[0];
    const className = derivePageName(first.element);

    const seenNames = new Map();
    const enriched = captures.map((c) => {
      let name = variableName(c.element);
      if (seenNames.has(name)) {
        const n = seenNames.get(name) + 1;
        seenNames.set(name, n);
        name = `${name}${n}`;
      } else {
        seenNames.set(name, 1);
      }
      return { ...c, fieldName: name };
    });

    const fieldLines = enriched.map((c) => {
      const fn = c.fieldName;
      if (c.isList && c.listLocator) {
        return `    private final By ${fn} = ${byLiteral(c.listLocator.type, c.listLocator.value)};`;
      }
      const best = c.best;
      if (!best || !best.value) return `    // ${fn}: no locator`;
      return `    private final By ${fn} = ${byLiteral(best.type, best.value)};`;
    });

    const methodBlocks = enriched.map((c) => pomActionFor(c));

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

  function byLiteral(type, value) {
    const safe = escapeJava(value);
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

  function pomActionFor(c) {
    const fn = c.fieldName;
    const cap0 = cap(fn);
    const tag = (c.element.tag || "").toLowerCase();
    const enter = frameSwitchInBody(c.frameChain);
    const leave = frameSwitchOutBody(c.frameChain);

    if (c.isList) {
      return [
        `    public List<WebElement> get${cap0}() {`,
        ...enter,
        `        List<WebElement> result = driver.findElements(${fn});`,
        ...leave,
        `        return result;`,
        `    }`,
        ``,
        `    public int ${fn}Count() {`,
        ...enter,
        `        int n = driver.findElements(${fn}).size();`,
        ...leave,
        `        return n;`,
        `    }`,
        ``,
        `    public WebElement get${cap0}At(int index) {`,
        ...enter,
        `        WebElement el = driver.findElements(${fn}).get(index);`,
        ...leave,
        `        return el;`,
        `    }`,
      ].join("\n");
    }

    if (tag === "input" || tag === "textarea") {
      return [
        `    public void set${cap0}(String value) {`,
        ...enter,
        `        WebElement el = driver.findElement(${fn});`,
        `        el.clear();`,
        `        el.sendKeys(value);`,
        ...leave,
        `    }`,
        ``,
        `    public String get${cap0}Value() {`,
        ...enter,
        `        String v = driver.findElement(${fn}).getAttribute("value");`,
        ...leave,
        `        return v;`,
        `    }`,
      ].join("\n");
    }
    if (tag === "select") {
      return [
        `    public void select${cap0}(String visibleText) {`,
        ...enter,
        `        new Select(driver.findElement(${fn})).selectByVisibleText(visibleText);`,
        ...leave,
        `    }`,
      ].join("\n");
    }
    return [
      `    public void click${cap0}() {`,
      ...enter,
      `        driver.findElement(${fn}).click();`,
      ...leave,
      `    }`,
      ``,
      `    public boolean is${cap0}Displayed() {`,
      ...enter,
      `        boolean v = driver.findElement(${fn}).isDisplayed();`,
      ...leave,
      `        return v;`,
      `    }`,
    ].join("\n");
  }

  /**
   * Java snippet for collection (List<WebElement>).
   */
  function javaListSnippet(listLocator, element, frameChain) {
    if (!listLocator || !listLocator.value) return "// No list locator";
    const varBase = variableName(element).replace(/(Button|Input|Link|Item|Element|Row|Cell)$/, "");
    const varName = varBase + "Items";
    const call = byCall(listLocator.type, listLocator.value);
    return [
      `// Collection capture — siblings detected`,
      ...emitFrameSwitchIn(frameChain),
      `List<WebElement> ${varName} = driver.findElements(${call});`,
      `System.out.println("Count: " + ${varName}.size());`,
      `for (WebElement item : ${varName}) {`,
      `    System.out.println(item.getText());`,
      `}`,
      ...emitFrameSwitchOut(frameChain),
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
  window.SmartLocator.code = {
    javaSnippet,
    javaListSnippet,
    pomClass,
    pomClassMulti,
    variableName,
  };
})();
