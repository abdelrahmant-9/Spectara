# Chrome Web Store — Listing Assets

> Drop-in copy + asset spec for the Chrome Web Store submission form.
> All fields tested against current Chrome Web Store policy (Developer Program Policies, May 2026).

---

## 1. Store Title

**Field max: 75 characters.**

```
Smart Selenium Locator Generator — POM + Java Codegen
```

(54 characters)

Alternates:
- `Smart Selenium — One-Click Locator & Java POM Generator` (55)
- `Selenium Locator Generator: XPath, CSS, Java, POM in One Click` (61)

---

## 2. Short Description (Summary)

**Field max: 132 characters. Shown in search results + Discover cards.**

```
Click any element. Get stable Selenium locators, Java snippets, and full Page Object Model classes — in three seconds.
```

(117 characters)

---

## 3. Long Description

**Field max: 16,000 characters. Markdown not rendered — plain text only, line breaks OK.**

```
Smart Selenium Locator Generator is a Chrome extension built for QA Automation Engineers and SDETs who are tired of writing locators by hand.

Click any element on any webpage and instantly receive:
• Five locator strategies (ID, Name, CSS Selector, Absolute XPath, Relative XPath)
• A "Best Locator" pick, ranked by stability — dynamic IDs and framework-generated classes are automatically skipped
• A ready-to-paste Selenium Java snippet
• A complete Page Object Model class generated from the URL slug
• A List<WebElement> collection locator when the element is part of a repeating list
• Full iframe support — generated code includes driver.switchTo().frame(...) chains automatically

──────────────────────────────────────
KEY FEATURES
──────────────────────────────────────

ONE-CLICK CAPTURE
Press Start Inspect. Click any element. Done.

SMART LOCATOR RANKING
The extension scans every candidate locator on the element and skips the ones that look unstable: pure-digit IDs, long hex hashes, framework prefixes (ng-, sc-, react-fb-, ember-), and CSS chains with brittle :nth-of-type calls.

AUTO-PROMOTE
Clicking on a decorative SVG, icon, or empty span automatically promotes the selection to the nearest actionable parent (button, link, input). Hold Alt to disable.

MULTI-CAPTURE MODE
Click multiple elements in one inspect session. The extension builds a complete POM class with all fields and methods — no copy-paste assembly.

LIST DETECTION
Click any item in a table, dropdown, menu, or product grid. The extension detects sibling patterns and generates a List<WebElement> locator plus an iteration snippet.

PAUSE MODE (P key)
Some elements only exist after a hover or click opens a popup (dropdowns, tooltips, custom menus). Pause mode disables capture so you can interact with the page naturally, then resumes when you press P again.

IFRAME SUPPORT
Same-origin and cross-origin iframes are supported through Chrome's per-frame content script model. Generated Java and POM code includes driver.switchTo().frame() chains so your tests work out of the box.

MODERN, ISOLATED UI
The in-page status panel runs inside a Shadow DOM root, so site CSS cannot break our overlay and our crosshair cursor cannot bleed into your page. The popup uses macOS Tahoe-inspired liquid-glass styling with dark and light themes.

OS-AWARE KEYBOARD HINTS
Shows ⌥ Option on macOS and Alt on Windows / Linux — small detail, big polish.

KEYBOARD SHORTCUTS
• Ctrl/Cmd + Shift + L — open the extension
• Alt + click — capture exact element (no auto-promote)
• P — pause / resume inspect
• Esc — cancel inspect

──────────────────────────────────────
WHO IT'S FOR
──────────────────────────────────────

• QA Automation Engineers writing Selenium tests in Java
• SDETs building Page Object Model frameworks
• QA Leads onboarding junior engineers
• Anyone who has ever written /div[3]/div[2]/span[1] and felt bad about it

──────────────────────────────────────
PRIVACY & SECURITY
──────────────────────────────────────

This extension:
• Does NOT collect, transmit, or sell any user data
• Does NOT make any network requests
• Does NOT use analytics, telemetry, or fingerprinting
• Stores everything locally in chrome.storage.local
• Is fully open source on GitHub (MIT license)
• Works completely offline

──────────────────────────────────────
OPEN SOURCE
──────────────────────────────────────

MIT licensed. Source code, issues, and contributions welcome:
https://github.com/abdelrahmant-9/smart-selenium-locator-generator

──────────────────────────────────────
SUPPORT
──────────────────────────────────────

• Email: abdelrahman.tarek.dev@gmail.com
• GitHub Issues: https://github.com/abdelrahmant-9/smart-selenium-locator-generator/issues

Built by a QA Automation Engineer for QA Automation Engineers.
```

---

## 4. SEO Keywords

**Used inline in long description above. Also useful for the developer dashboard "Other details" → tags.**

Primary:
- selenium
- selenium java
- locator generator
- xpath generator
- css selector
- page object model
- pom
- test automation
- qa automation
- sdet

Secondary:
- web automation
- chrome extension qa
- element inspector
- automation tool
- selenium ide
- selenium webdriver
- testing framework
- xpath finder
- css finder
- java codegen

Long-tail (for blog / dev.to articles):
- "selenium java page object model generator"
- "auto-generate xpath chrome extension"
- "selenium locator from click chrome"
- "page object model auto generator chrome"

---

## 5. Category

**Primary:** `Developer Tools`
**Tags (max 5):** `developer`, `productivity`, `automation`, `testing`, `selenium`

---

## 6. Promo Text / Tagline (small promo tile)

**Field max: 80 characters.**

```
Selenium locators + Java POM, generated from a click. Free. Open source.
```

(72 characters)

---

## 7. Screenshot Captions

Used in the Chrome Web Store screenshot carousel. **Field max: 80 chars each.**

1. `Click any element — get the most stable locator, ranked by reliability.`
2. `Selenium Java snippet ready to paste into your test suite.`
3. `Full Page Object Model class generated automatically.`
4. `Multi-capture mode builds a complete POM in one inspect session.`
5. `Click one item in a list — get a List<WebElement> locator instantly.`
6. `iframe support: switchTo().frame() chains generated automatically.`

---

## 8. Feature Bullet Points

For LinkedIn launch post, Product Hunt, landing page hero.

```
✓ Five locator strategies + Smart Best-Locator ranking
✓ Selenium Java snippet + full Page Object Model in one click
✓ Multi-element capture builds a complete POM in one session
✓ List / collection detection → List<WebElement>
✓ iframe traversal with driver.switchTo().frame() chains
✓ Pause mode for hover popups, dropdowns, tooltips
✓ Dark + light themes, macOS Tahoe-inspired UI
✓ Zero data collection, zero network requests, fully offline
✓ Open source — MIT license
✓ Free
```

---

## 9. Release Notes (v1.3.0)

Shown in the "What's New" section after install.

```
v1.3.0 — Production Launch

NEW
• iframe traversal: capture elements inside same-origin and cross-origin iframes; generated code includes driver.switchTo().frame(...) chains
• Multi-capture mode: build a full Page Object Model class in one inspect session
• List detection: click one item in a list → get a List<WebElement> locator and iteration snippet
• Pause mode (P key): open hover popups and menus naturally, then resume capture
• OS-aware keyboard shortcuts: shows ⌥ Option on macOS, Alt elsewhere
• First-run onboarding banner
• Keyboard shortcut Ctrl/Cmd + Shift + L to open the extension anywhere

IMPROVED
• Floating panel now lives inside a Shadow DOM root — site CSS can no longer interfere with its buttons
• Background service worker now caps stored captures at 100 to keep storage usage tiny
• Better empty-state messages for unsupported pages
• Tightened permissions: removed unused tabs permission and web_accessible_resources

FIXED
• Multi-capture only stored last click when popup auto-closed (storage race fixed)
• Pause / Done buttons missed clicks on some pages due to host CSS bleed (Shadow DOM fix)
• Generated POM methods now wrap frame switches around every element interaction
```

---

## 10. FAQ Section (for landing page or docs)

**Q: Is this a paid extension?**
A: No. It is free and open source under the MIT license. A Pro tier with cloud sync and Playwright/Cypress codegen is on the roadmap, but the core extension will always stay free.

**Q: Does it work for Selenium Python or other languages?**
A: Currently it generates Selenium Java only. Playwright (TypeScript + Python) and Cypress generators are on the V2 roadmap.

**Q: Will it work inside iframes?**
A: Yes. Same-origin and cross-origin iframes are supported. The generated code automatically includes driver.switchTo().frame() chains.

**Q: What about Shadow DOM?**
A: Coming in v2. Open shadow roots will be supported with shadow-root-aware locator strategies.

**Q: Does it collect any data?**
A: No. The extension does not make any network requests, does not use analytics, and stores everything locally in chrome.storage.local. Read the privacy policy in the repo.

**Q: Will the locators work in CI?**
A: Yes. The locators are standard Selenium 4 By.id / By.name / By.cssSelector / By.xpath calls. The extension's ranking algorithm skips dynamic IDs and framework prefixes, so the generated locators should be as stable as hand-crafted ones — often more so.

**Q: How does the "auto-promote" feature work?**
A: When you click a decorative element like an SVG icon or an empty span, the extension walks up the DOM to find the nearest interactive ancestor (button, link, input, label) or any ancestor with a stable attribute. This usually gives you the correct target for automation. Hold Alt to disable.

**Q: What if the locator the extension picks is not stable enough?**
A: The popup shows all five locator strategies plus a "Best" pick. You can copy whichever one your test framework prefers. Right-click on an element with Alt held to capture the exact node without auto-promotion.

**Q: Can I import / export captures?**
A: Export to .java file and JSON sessions are coming in v1.4. For now, copy individual snippets or the full POM class with the Copy buttons.

**Q: Is this affiliated with Selenium or Software Freedom Conservancy?**
A: No. This is an independent open-source project. "Selenium" is used descriptively because the extension targets the Selenium WebDriver API.

---

## 11. Submission Form — Single Purpose Description

Chrome Web Store requires a "single purpose" statement on the developer dashboard.

```
This extension has a single purpose: generating Selenium locators and Java/POM code from web elements that the user clicks while inspect mode is active. All processing happens locally in the browser. No data is collected or transmitted.
```

---

## 12. Permissions Justification (per permission, submission form)

### `activeTab`
```
Used to send START_INSPECT and STOP_INSPECT messages to the active tab's content script when the user clicks the extension's Start / Stop buttons in the popup.
```

### `scripting`
```
Used as a fallback to inject the content scripts on pages that were already loaded before the extension was installed. Without it, the user would have to refresh every existing tab once after installing the extension.
```

### `storage`
```
Used to persist captured elements (chrome.storage.local) so that the popup can show the user's most recent captures when reopened, and to remember user preferences (dark/light theme, single/multi mode). No data leaves the device.
```

### `host_permissions: <all_urls>`
```
Required because the extension's core function is generating locators for elements on any webpage the user inspects. There is no way to restrict to specific URLs in advance — the user decides which page to inspect at click time. No content is sent off-device.
```

---

## 13. Privacy Practices (submission form yes/no answers)

| Question | Answer |
|----------|--------|
| Does this extension collect or use personally identifiable information? | **No** |
| Does this extension collect or use health information? | **No** |
| Does this extension collect or use financial or payment information? | **No** |
| Does this extension collect or use authentication information? | **No** |
| Does this extension collect or use personal communications? | **No** |
| Does this extension collect or use location? | **No** |
| Does this extension collect or use web history? | **No** |
| Does this extension collect or use user activity? | **No** |
| Does this extension collect or use website content? | **No (locators are generated locally and stored locally; no transmission)** |

| Certification | Answer |
|---------------|--------|
| I do not sell or transfer user data to third parties, outside of the approved use cases | **Yes** |
| I do not use or transfer user data for purposes that are unrelated to my item's single purpose | **Yes** |
| I do not use or transfer user data to determine creditworthiness or for lending purposes | **Yes** |

---

## 14. Asset File Specification

| Asset | Required size | Format | Notes |
|-------|--------------|--------|-------|
| Store icon | 128×128 | PNG | Already in assets/icon128.png |
| Toolbar icon | 16×16, 32×32, 48×48, 128×128 | PNG | Generated by scripts/generate-icons.py |
| Small promo tile | 440×280 | PNG / JPG | Required for featured placement; optional otherwise |
| Marquee promo tile | 1400×560 | PNG / JPG | Optional, used in editorial features |
| Screenshots | 1280×800 or 640×400 | PNG / JPG | Up to 5, at least 1 required. See SCREENSHOT_PLAN.md |
