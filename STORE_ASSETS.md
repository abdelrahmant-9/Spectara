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

That's the free tier. The optional Pro tier ($4.99/mo, 7-day free trial) adds multi-element capture, Page Object Model generation, iframe + Shadow DOM traversal, Playwright codegen, .java file export, and live locator validation.

──────────────────────────────────────
FREE TIER (open-core, MIT)
──────────────────────────────────────

ONE-CLICK CAPTURE
Press Start Inspect. Click any element. Done.

SMART LOCATOR RANKING
The extension scans every candidate locator on the element and skips the ones that look unstable: pure-digit IDs, long hex hashes, framework prefixes (ng-, sc-, react-fb-, ember-), and CSS chains with brittle :nth-of-type calls.

AUTO-PROMOTE
Clicking on a decorative SVG, icon, or empty span automatically promotes the selection to the nearest actionable parent (button, link, input). Hold Alt to disable.

PAUSE MODE (P key)
Some elements only exist after a hover or click opens a popup (dropdowns, tooltips, custom menus). Pause mode disables capture so you can interact with the page naturally, then resumes when you press P again.

MODERN, ISOLATED UI
The in-page status panel runs inside a Shadow DOM root, so site CSS cannot break our overlay and our crosshair cursor cannot bleed into your page. The popup uses macOS Tahoe-inspired liquid-glass styling with dark and light themes.

KEYBOARD SHORTCUTS
• Ctrl/Cmd + Shift + L — open the extension
• Alt + click — capture exact element (no auto-promote)
• P — pause / resume inspect
• Esc — cancel inspect

──────────────────────────────────────
PRO TIER — 7-DAY FREE TRIAL · $4.99/mo or $39/yr (save 35%)
──────────────────────────────────────

MULTI-CAPTURE MODE
Click multiple elements in one inspect session. The extension builds a complete Page Object Model class with all fields and action methods — no copy-paste assembly.

PAGE OBJECT MODEL GENERATION
Single and combined POM classes with smart variable naming (emailInput, loginButton), action helpers (setX, clickX, isXDisplayed, selectX, getXList, xCount, getXAt), and proper Selenium 4 imports.

IFRAME TRAVERSAL
Same-origin and cross-origin iframes via Chrome's per-frame content script model. Generated code includes driver.switchTo().frame() chains so your tests work out of the box on nested iframe forms (payment widgets, embedded apps, etc.).

SHADOW DOM TRAVERSAL
Open shadow roots are walked via host.shadowRoot chains. Generated code uses Selenium 4.4+ WebElement.getShadowRoot() + SearchContext.findElement for clean cross-shadow access. Closed shadow roots are detected and reported.

LIST / COLLECTION DETECTION
Click one item in a table, dropdown, menu, or product grid. The extension detects sibling patterns and generates a List<WebElement> locator plus an iteration snippet and POM list helpers.

PLAYWRIGHT CODEGEN
TypeScript and Python snippets with page.locator(), getByRole, getByLabel, getByTestId, frameLocator() for iframes, and locator() chaining through shadow boundaries.

EXPORT .JAVA FILE
One-click download of the full POM as a real .java file with the derived class name as the filename.

LIVE LOCATOR VALIDATION
Each locator card shows a live match-count badge — ✓ unique, ⚠ N matches, ✗ broken — by querying the page DOM in real time.

7-DAY FREE TRIAL
No credit card required. One-shot, local. Click "Start free trial" inside the Pro tab.

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
• Does NOT use analytics, telemetry, or fingerprinting
• Stores all captures locally in chrome.storage.local
• Core is open source under MIT on GitHub (open-core model)
• Works completely offline for free users
• Pro users only: sends one license-validation request per 24 hours to api.smartselenium.dev (license key only — no captures, no element data)

──────────────────────────────────────
OPEN SOURCE
──────────────────────────────────────

Open-core model. Core is MIT-licensed and fully public. Official Pro builds include licensed premium features and future cloud capabilities. Source code, issues, and contributions welcome:
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
Free Selenium locators from one click. Pro $4.99/mo: POM, iframe, Playwright.
```

(78 characters)

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
FREE:
✓ Single-element capture
✓ Five locator strategies + Smart Best-Locator ranking
✓ Selenium Java snippet
✓ Auto-promote, Pause mode, ALT exact node
✓ Dark + light themes, macOS Tahoe-inspired UI

PRO (7-day free trial · $4.99/mo or $39/yr — save 35%):
✓ Multi-element capture (full POM in one session)
✓ Page Object Model generation
✓ iframe traversal + driver.switchTo().frame()
✓ Shadow DOM traversal + getShadowRoot()
✓ Playwright TypeScript + Python codegen
✓ Export full POM as .java file
✓ Live locator validation
✓ Cypress codegen + cloud sync (coming soon)
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
A: It uses an open-core model with a 7-day free trial on Pro. The free tier (open source under MIT) covers single-element capture, all five locator strategies, smart best-locator ranking, and Selenium Java snippet generation — enough to replace your current "right-click → copy XPath" workflow. The Pro tier ($4.99/mo or $39/yr — save 35%) adds multi-capture + full Page Object Model generation, iframe + Shadow DOM traversal, Playwright TypeScript and Python codegen, .java file export, live locator validation, and upcoming cloud sync. Start the 7-day free trial inside the Pro tab — no credit card required.

**Q: Does it work for Selenium Python or other languages?**
A: Currently it generates Selenium Java only. Playwright (TypeScript + Python) and Cypress generators are on the V2 roadmap.

**Q: Will it work inside iframes?**
A: Yes. Same-origin and cross-origin iframes are supported. The generated code automatically includes driver.switchTo().frame() chains.

**Q: What about Shadow DOM?**
A: Open shadow roots are fully supported. The extension walks through host.shadowRoot chains and emits Selenium 4.4+ code with WebElement.getShadowRoot() + SearchContext.findElement(By.cssSelector(...)). Closed shadow roots are detected and reported as uninspectable.

**Q: Does it collect any data?**
A: No personal data, ever. Captures are stored locally in chrome.storage.local and never transmitted. No analytics, no telemetry, no fingerprinting. Free users make zero network requests. Pro users send one license-validation request per 24 hours (license key only). Source is fully auditable on GitHub.

**Q: Will the locators work in CI?**
A: Yes. The locators are standard Selenium 4 By.id / By.name / By.cssSelector / By.xpath calls. The extension's ranking algorithm skips dynamic IDs and framework prefixes, so the generated locators should be as stable as hand-crafted ones — often more so.

**Q: How does the "auto-promote" feature work?**
A: When you click a decorative element like an SVG icon or an empty span, the extension walks up the DOM to find the nearest interactive ancestor (button, link, input, label) or any ancestor with a stable attribute. This usually gives you the correct target for automation. Hold Alt to disable.

**Q: What if the locator the extension picks is not stable enough?**
A: The popup shows all five locator strategies plus a "Best" pick. You can copy whichever one your test framework prefers. Right-click on an element with Alt held to capture the exact node without auto-promotion.

**Q: Can I import / export captures?**
A: In multi-capture mode the captures strip has a "Copy all" button with three formats: Java field declarations (paste into a POM), human-readable locators list, and JSON. Pro tier adds an "Export .java" button that downloads the full POM as a real file. Cloud sync of captures across devices is planned for the next release.

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
| Does this extension collect or use website content? | **No (locators are generated locally and stored locally; element data is never transmitted off-device. Pro license validation sends only the license key, no website content.)** |

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
