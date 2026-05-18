<div align="center">

# Smart Selenium Locator Generator

**A Chrome extension that captures any element on any webpage and instantly generates Selenium Java locators, code snippets, and Page Object Model classes.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
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

### Core (v1.0)

- **One-click capture** — click any element, get all five locator types
- **Smart locator ranking** — automatically picks the most stable locator (skips dynamic IDs, framework hashes, random digits)
- **Auto-promote** — click on a decorative SVG/icon and the extension walks up to the actionable `<button>` parent (hold **ALT** to override)
- **Five locator types** — ID, Name, CSS Selector, Absolute XPath, Relative XPath
- **Selenium Java snippet** — `WebElement … driver.findElement(...)` with smart variable naming (`emailInput`, `loginButton`)
- **Page Object Model** — full POM class generated from element + URL slug
- **In-page floating panel** — Stop button always visible while inspecting
- **macOS Tahoe-inspired UI** — liquid glass, vibrant accent, SF Pro typography, dark + light themes
- **One-click copy** on every locator and snippet
- **Persistent history** — last capture restored when popup reopens
- **Keyboard shortcuts** — `ALT` for exact node, `ESC` to cancel inspect

### Roadmap (v2.0)

- [ ] iframe + Shadow DOM traversal
- [ ] Multi-element capture (build POM from multiple clicks)
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

### Quick flow

1. Open any website
2. Click the extension icon → press **Start Inspect**
3. The popup closes automatically and a floating panel appears on the page
4. Hover any element — blue outline follows your cursor
5. Click it — the popup reopens (next time) with all locators
6. Switch tabs: **Locators · Java · POM · Element**
7. Click **Copy** on any block

### Keyboard

| Key | Action |
|-----|--------|
| `ALT` + click | Capture exact element (skip auto-promote) |
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
| `content.js` | Hover overlay, click capture, ESC handling, in-page status panel, auto-promote |
| `xpathGenerator.js` | Builds positional, attribute-based, and text-based XPath; detects dynamic values |
| `cssGenerator.js` | Builds shortest unique CSS selector; falls back to `:nth-of-type` chain |
| `locatorPriority.js` | Ranks candidate locators and picks the best |
| `codeGenerator.js` | Generates Java `By.*` calls and full POM classes with smart variable names |
| `popup.js` | Compact / expanded state machine, message routing, theme + storage |

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

### Captured element
```html
<button id="login-submit" class="btn btn-primary">Sign In</button>
```

### Locators
```
Best:        By.id = login-submit
ID:          login-submit
Name:        —
CSS:         #login-submit
XPath:       /html/body[1]/.../button[1]
Rel XPath:   //*[@id='login-submit']
```

### Selenium Java
```java
// BUTTON — id
WebElement loginSubmitButton = driver.findElement(By.id("login-submit"));
loginSubmitButton.click();
```

### Page Object Model
```java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class LoginPage {

    private final WebDriver driver;

    public LoginPage(WebDriver driver) {
        this.driver = driver;
    }

    private final By loginSubmitButton = By.id("login-submit");

    public void clickLoginSubmitButton() {
        driver.findElement(loginSubmitButton).click();
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

## License

MIT © [Abdelrahman Tarek](https://github.com/abdelrahmant-9)

---

<div align="center">
  <sub>Built for QA Automation Engineers who are tired of writing locators.</sub>
</div>
