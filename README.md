<div align="center">

# Smart Selenium Locator Generator

**A Chrome extension that captures any element on any webpage and instantly generates Selenium Java locators, code snippets, and Page Object Model classes.**

[![License: MIT](https://img.shields.io/badge/Core-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Model: Open-Core](https://img.shields.io/badge/Model-Open--Core-43B02A)](#license--open-core-model)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Selenium](https://img.shields.io/badge/Selenium-Java-43B02A?logo=selenium&logoColor=white)](https://www.selenium.dev/)
[![Status](https://img.shields.io/badge/Status-Active-success)]()

</div>

---

## Why this exists

Writing locators is the most thankless part of test automation. You inherit a flaky test suite, half the locators are `/div[3]/div[2]/span[1]`, the other half break when a designer changes a class name. You spend more time fixing locators than writing tests.

**Smart Selenium Locator Generator** kills that friction. Click any element on any webpage. Get the best locator, ranked by stability, plus a ready-to-paste Selenium Java snippet and a generated Page Object Model class — in three seconds.

---

## Features

### Core (v1.2)

- **One-click capture** — click any element, get all five locator types
- **Smart locator ranking** — automatically picks the most stable locator (skips dynamic IDs, framework hashes, random digits)
- **Auto-promote** — click on a decorative SVG/icon and the extension walks up to the actionable `<button>` parent (hold **ALT** to override)
- **Five locator types** — ID, Name, CSS Selector, Absolute XPath, Relative XPath
- **Selenium Java snippet** — `WebElement … driver.findElement(...)` with smart variable naming (`emailInput`, `loginButton`)
- **Page Object Model** — full POM class generated from element + URL slug
- **Multi-element capture mode** — keep clicking to build a full POM in a single session, with a live capture list (per-item remove, click-to-view)
- **List / collection detection** — click any item in a repeated list (table rows, menu items, product cards) and the extension auto-generates a `List<WebElement>` locator plus iteration snippet
- **Combined POM** — multi-capture rebuilds one POM class with all fields + actions on every click; list captures get `getXxx()`, `xxxCount()`, `getXxxAt(int)` helpers
- **Pause mode (P key)** — temporarily disable inspect to open hover-triggered popups, dropdowns, tooltips, accordions, modals; resume to capture items inside
- **In-page floating panel** — Pause / Stop buttons always visible while inspecting, live capture counter in Multi mode
- **macOS Tahoe-inspired UI** — liquid glass, vibrant accent, SF Pro typography, dark + light themes
- **Compact + expanded popup states** — minimal hero when there's no history, full UI once you've captured
- **One-click copy** on every locator and snippet
- **Persistent history** — captures restored when popup reopens
- **Keyboard shortcuts** — `ALT` for exact node, `P` to pause, `ESC` to cancel inspect

### Roadmap (v2.0)

- [ ] iframe + Shadow DOM traversal
- [ ] Locator validation (count matches on the page)
- [ ] Export full POM as `.java` file download
- [ ] Playwright + Cypress code generators
- [ ] LLM-powered assertion + action suggestions
- [ ] Chrome Web Store listing

---

## Installation

### Load as Unpacked Extension

1. Clone or download this repo:
   ```bash
   git clone https://github.com/abdelrahmant-9/smart-selenium-locator-generator.git
   ```
2. Open Chrome → `chrome://extensions`
3. Toggle **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `smart-selenium-locator-generator/` folder
6. Pin the extension icon to the toolbar

> Chrome will not allow inspection on `chrome://`, `edge://`, or `about:` pages — open a regular website to test.

---

## Usage

### Quick flow — single element

1. Open any website
2. Click the extension icon
3. Pick **Single** mode (default) → press **Start Inspect**
4. The popup closes automatically and a floating panel appears on the page
5. Hover any element — blue outline follows your cursor
6. Click it — the popup reopens (next time) with all locators
7. Switch tabs: **Locators · Java · POM · Element**
8. Click **Copy** on any block

### Multi-element capture

1. Click the extension icon
2. Switch to **Multi-capture** mode
3. Press **Start Multi-capture**
4. Click multiple elements one after another — floating panel shows the live count
5. Press **Done** on the floating panel when finished
6. Reopen the popup — the **Captures strip** lists every element
7. The **POM** tab now contains a complete class with one field + method block per capture

### Capturing a list / table / repeated items

1. Start Inspect on any mode
2. Click **one** item in the list (a table row, a menu item, a product card)
3. The extension detects sibling elements matching the same pattern and shows:
   - A **List card** on the **Locators** tab with the collection locator and item count
   - A **Java List card** on the **Java** tab with a `findElements` snippet + iteration loop
4. In Multi-capture mode the POM is enriched with `getXxx()`, `xxxCount()`, and `getXxxAt(int)` helpers for that list

### Capturing elements inside hover popups / dropdowns / tooltips

Some elements only exist after a hover or after another element is clicked open (custom menus, autocomplete suggestions, popovers, modals). Use **Pause mode**:

1. Start Inspect
2. Press **`P`** (or click the **Pause** button on the floating panel)
3. The overlay hides and the page becomes fully interactive — the panel turns orange
4. Open the popup naturally (hover the trigger, click to expand, etc.)
5. Position your cursor on the element you want inside the popup
6. Press **`P`** again to resume inspect
7. Click — the element inside the popup is captured

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `ALT` + click | Capture exact element (skip auto-promote) |
| `P` | Toggle Pause / Resume (lets you open menus and popups normally) |
| `ESC` | Cancel inspect mode |

---

## Architecture

```
smart-selenium-locator-generator/
├── manifest.json              # Manifest V3 config
├── popup/
│   ├── popup.html             # Two states: compact (empty) + expanded (results)
│   ├── popup.css              # macOS Tahoe-inspired liquid-glass styling
│   └── popup.js               # State machine, message bridge, copy handlers
├── content/
│   └── content.js             # Inspect mode lifecycle, overlay, panel, capture
├── background/
│   └── background.js          # Service worker (lightweight relay)
├── utils/
│   ├── xpathGenerator.js      # Absolute + relative + attribute + text XPath
│   ├── cssGenerator.js        # Shortest unique CSS selector with fallback
│   ├── locatorPriority.js     # Stability ranking (id → name → css → xpath)
│   └── codeGenerator.js       # Selenium Java snippet + POM class
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE
└── README.md
```

### Module responsibilities

| Module | Responsibility |
|--------|----------------|
| `content.js` | Inspect lifecycle, hover overlay, click capture, in-page floating panel, auto-promote, pause toggle, list detection |
| `xpathGenerator.js` | Builds positional, attribute-based, and text-based XPath; detects dynamic values |
| `cssGenerator.js` | Builds shortest unique CSS selector; falls back to `:nth-of-type` chain |
| `locatorPriority.js` | Ranks candidate locators and picks the best |
| `codeGenerator.js` | Generates Java `By.*` calls, list snippets, single + combined POM classes, smart variable names |
| `popup.js` | Compact / expanded state machine, mode toggle (Single / Multi), captures list, combined POM regen, message routing, theme + storage |

---

## Smart Locator Rules

The extension ranks locators in this order, and skips any that look unstable:

1. **`id`** — only if not dynamic
2. **`name`** — only if not dynamic
3. **CSS Selector** — must be unique on the page, no `:nth-of-type` chains
4. **Relative XPath** — built from stable attributes (`id`, `data-testid`, `aria-label`, `name`, `placeholder`, `role`, `for`)
5. **Absolute XPath** — last resort

### Dynamic-value detection skips:

- Pure digits (`12345`)
- Long hex hashes (`abc123def456`)
- Anything with 4+ consecutive digits (`user-2849-input`)
- Framework-generated prefixes (`ng-tns-`, `sc-abc`, `react-fb`, `ember-…`)

### Stable attributes scanned (in order):

`id`, `name`, `data-testid`, `data-test`, `data-qa`, `data-cy`, `aria-label`, `placeholder`, `title`, `for`, `role`

---

## Example Output

### Single-element capture

**Captured:**
```html
<button id="login-submit" class="btn btn-primary">Sign In</button>
```

**Locators:**
```
Best:        By.id = login-submit
ID:          login-submit
Name:        —
CSS:         #login-submit
XPath:       /html/body[1]/.../button[1]
Rel XPath:   //*[@id='login-submit']
```

**Selenium Java:**
```java
// BUTTON — id
WebElement loginSubmitButton = driver.findElement(By.id("login-submit"));
loginSubmitButton.click();
```

### List detection

**Captured** (click one `<li>` in a repeating list):
```html
<ul class="products">
  <li class="product-item">...</li>
  <li class="product-item">...</li>
  <li class="product-item">...</li>
</ul>
```

**List locator + snippet:**
```java
// Collection capture — siblings detected
List<WebElement> productItems = driver.findElements(By.cssSelector("ul.products > li.product-item"));
System.out.println("Count: " + productItems.size());
for (WebElement item : productItems) {
    System.out.println(item.getText());
}
```

### Combined POM (Multi-capture mode)

After capturing an email input, password input, login button, and a list of error messages:

```java
import java.util.List;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.Select;

public class LoginPage {

    private final WebDriver driver;

    public LoginPage(WebDriver driver) {
        this.driver = driver;
    }

    private final By emailInput = By.id("email");
    private final By passwordInput = By.id("password");
    private final By loginButton = By.cssSelector("button.btn-primary");
    private final By errorMessages = By.cssSelector("ul.errors > li");

    public void setEmailInput(String value) {
        WebElement el = driver.findElement(emailInput);
        el.clear();
        el.sendKeys(value);
    }

    public String getEmailInputValue() {
        return driver.findElement(emailInput).getAttribute("value");
    }

    public void setPasswordInput(String value) {
        WebElement el = driver.findElement(passwordInput);
        el.clear();
        el.sendKeys(value);
    }

    public String getPasswordInputValue() {
        return driver.findElement(passwordInput).getAttribute("value");
    }

    public void clickLoginButton() {
        driver.findElement(loginButton).click();
    }

    public boolean isLoginButtonDisplayed() {
        return driver.findElement(loginButton).isDisplayed();
    }

    public List<WebElement> getErrorMessages() {
        return driver.findElements(errorMessages);
    }

    public int errorMessagesCount() {
        return driver.findElements(errorMessages).size();
    }

    public WebElement getErrorMessagesAt(int index) {
        return driver.findElements(errorMessages).get(index);
    }
}
```

---

## Tech Stack

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript (ES6+)** — zero dependencies
- **HTML + CSS** — modern features: `backdrop-filter`, `color-mix()`, CSS variables
- **Chrome APIs** — `scripting`, `storage`, `tabs`, `runtime`

---

## Design Inspiration

UI mirrors **macOS Tahoe / 26.5** design language:

- Liquid-glass translucent surfaces (`backdrop-filter: blur(20-30px) saturate(180%)`)
- Vibrant systemBlue accent with soft glow shadows
- Segmented control tabs (native macOS pattern)
- SF Pro typography stack
- Rounded 14-18px geometry
- macOS color palette (systemBlue, systemGreen, systemRed, systemOrange, systemPurple, systemTeal, systemYellow)

---

## Known Limitations

- iframes and Shadow DOM are not traversed (roadmap v2)
- Cannot inspect Chrome internal pages (`chrome://`, `chrome-extension://`)
- Some sites with strict CSP may block content script injection — reload the page if inspect fails
- Generated Java assumes Selenium 4 syntax
- Custom popups that close on `mousemove` away from the trigger may need **Pause mode** (`P`) — open them naturally, then resume inspect to click the target

---

## Contributing

Issues and PRs welcome. For larger changes, open an issue first to discuss the approach.

```bash
# Clone
git clone https://github.com/abdelrahmant-9/smart-selenium-locator-generator.git
cd smart-selenium-locator-generator

# Load into Chrome (no build step required)
# chrome://extensions → Developer mode → Load unpacked → select folder
```

---

## License & Open-Core Model

**Core is open source under MIT.** Official Pro builds include licensed premium features and future cloud capabilities.

### What's in the free core (MIT)
- Element inspect, capture, and highlight
- Five locator strategies (ID, Name, CSS, XPath, Relative XPath)
- Smart Best-Locator ranking + dynamic-value detection
- Selenium Java snippet generation
- Page Object Model class generation
- Multi-capture, list detection, iframe + Shadow DOM traversal
- Pause mode, auto-promote, copy buttons, dark/light themes

### What's in the optional Pro tier ($4.99/mo)
- Playwright TypeScript + Python codegen
- Export full POM as `.java` file
- Live locator validation (uniqueness + match count)
- Cypress codegen *(coming soon)*
- Cloud sync of captures across devices *(coming soon, server-side)*

The Pro module source lives in this same public repository under `pro/` for full transparency. The official Chrome Web Store build gates these features behind a client-side license check validated against our backend. Self-builders are free to fork and modify under MIT terms — paying customers are supporting ongoing development, official Web Store auto-updates, priority support, and the upcoming server-side features (cloud sync, team workspaces) that cannot be replicated without the backend.

This is the **open-core model** used by projects like VS Code, GitLab, Sentry, and Bitwarden.

MIT © [Abdelrahman Tarek](https://github.com/abdelrahmant-9)

---

<div align="center">
  <sub>Built for QA Automation Engineers who are tired of writing locators.</sub>
</div>
