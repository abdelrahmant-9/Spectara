# Landing Page Copy

> Drop-in copy for a single-page landing site (Framer, Carrd, Webflow, custom HTML).
> Designed for `smartselenium.dev`. All wording aligned with the open-core positioning.

---

## Hero

**Headline (H1)**
```
Selenium locators in three seconds.
```

**Sub-headline**
```
Click any element on any webpage and instantly get stable Selenium locators, Java snippets, and full Page Object Model classes — with full iframe and Shadow DOM support.
```

**CTA buttons**
- Primary: `Install free on Chrome` → Chrome Web Store URL
- Secondary: `Start 7-day Pro trial` → Chrome Web Store URL (trial starts inside extension)
- Tertiary (small): `See pricing — $4.99/mo or $39/yr` → anchor to pricing block

**Trust line under CTAs**
```
Open-core · MIT-licensed core on GitHub · Manifest V3 · Zero data collection
```

---

## Social proof strip

(Once you have stats; placeholders OK at launch)

```
★ 4.9 on Chrome Web Store  ·  N installs  ·  N GitHub stars  ·  Open-core since 2026
```

---

## Problem section

**H2**
```
Hand-crafting locators is the worst part of test automation.
```

**Body**
```
You inherit a flaky test suite. Half the locators look like /div[3]/div[2]/span[1]. The other half break when a designer renames a CSS class. You spend more time fixing locators than writing tests.

Smart Selenium kills that friction. Click an element. Get the most stable locator, ranked by reliability. Plus a Java snippet. Plus a full Page Object Model class. All in three seconds.
```

---

## Feature grid (3 × 2)

**Card 1 — Smart Locator Ranking**
```
Five strategies generated per click. Dynamic IDs, framework hashes, and brittle nth-of-type chains are automatically skipped. You only see locators that survive CI.
```

**Card 2 — Page Object Model Codegen**
```
Multi-capture mode builds an entire POM class in one inspect session. Field declarations, action methods, list helpers — written for you.
```

**Card 3 — iframe + Shadow DOM**
```
Generated code includes driver.switchTo().frame() chains for nested iframes and WebElement.getShadowRoot() chains for open shadow roots. No manual switchTo.
```

**Card 4 — Pause Mode**
```
Need to capture an element inside a hover-triggered popup? Press P to pause inspect, open the menu naturally, press P again to resume and click your target.
```

**Card 5 — List Detection**
```
Click one item in a table or product grid. The extension detects sibling patterns and generates a List<WebElement> locator plus an iteration snippet.
```

**Card 6 — Auto-Promote**
```
Click on a decorative SVG icon — the extension walks up to the actionable parent button. Hold Alt to capture the exact node instead.
```

---

## Open-core section

**H2**
```
Open-core: free core, optional Pro.
```

**Body**
```
The core extension is open source under MIT. Everything you need to generate stable Selenium locators — five strategies, smart ranking, multi-capture, list detection, iframe and Shadow DOM traversal, Pause mode, the floating panel UI — is free, public on GitHub, and will always stay free.

The optional Pro tier ($4.99/mo) adds Playwright TypeScript and Python codegen, .java file export, live locator validation, and upcoming server-side features like cloud sync of captures across devices. Pro source lives in the same public repo for full transparency; the official Pro build is gated behind a license check and distributed through the Chrome Web Store.

Self-builders can fork the source under MIT terms. Paying customers are supporting ongoing development, official Web Store auto-updates, priority support, and the upcoming server-side features that can't be replicated without our backend.

This is the same pattern used by VS Code, GitLab, Sentry, and Bitwarden.
```

**Two columns**

| Free core (MIT) | Pro — 7-day trial · $4.99/mo or $39/yr |
|-----------------|----------------------------------------|
| Single-element capture | Multi-element capture |
| 5 locator strategies | Page Object Model generation |
| Smart best-locator ranking | iframe traversal + switchTo().frame() |
| Selenium Java snippet | Shadow DOM traversal + getShadowRoot() |
| Auto-promote + Pause mode | List / collection detection |
| Dark + light themes | Playwright TypeScript + Python codegen |
| Keyboard shortcuts | Export full POM as .java file |
| | Live locator validation |
| | Cypress codegen *(coming soon)* |
| | Cloud sync of captures *(coming soon)* |

---

## Pricing block

**Free**
- $0 forever
- Single-element capture
- 5 locator strategies + ranking
- Selenium Java snippet
- Community support via GitHub Issues
- CTA: `Install free on Chrome`

**Pro · 7-day free trial**
- **$4.99 / month** — cancel anytime
- **$39 / year** — save 35% (~$3.25/mo)
- Everything in Free
- Plus multi-capture, POM, iframe, Shadow DOM, Playwright codegen, .java export, live validation
- Priority email support
- Cloud sync + Cypress (coming soon)
- CTA: `Start free trial` (primary) · `Buy Pro` (secondary)
- 14-day refund

---

## FAQ (use 6-8 from STORE_ASSETS.md §10)

Pull the most-asked:
1. Is this a paid extension?
2. Will it work inside iframes?
3. What about Shadow DOM?
4. Does it collect any data?
5. Will the locators work in CI?
6. Can I import / export captures?
7. Is this affiliated with Selenium?

---

## Footer

```
Smart Selenium Locator Generator
Core open source under MIT — Pro builds licensed.
Built for QA Automation Engineers who are tired of writing locators.

GitHub · Chrome Web Store · Privacy · LemonSqueezy
© 2026 Abdelrahman Tarek
```

---

## Meta tags (for HTML <head>)

```html
<title>Smart Selenium — Selenium locators from one click</title>
<meta name="description" content="Chrome extension that turns one click into stable Selenium locators, Java snippets, and full Page Object Model classes for QA automation engineers.">
<meta property="og:title" content="Smart Selenium Locator Generator">
<meta property="og:description" content="Click any element. Get stable Selenium locators, Java snippets, and Page Object Model classes. Open-core: free MIT core + optional Pro tier.">
<meta property="og:image" content="/og-image.png">
<meta property="og:url" content="https://smartselenium.dev">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```
