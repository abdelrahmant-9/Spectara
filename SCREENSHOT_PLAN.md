# Screenshot Plan — Chrome Web Store

Target spec: **1280 × 800 PNG**, no compression artifacts. Up to 5 screenshots in the carousel.

Visual identity:
- Background: dark gradient `#1c1c1e → #2c2c2e` matching extension dark theme
- Accent: `#0a84ff` (systemBlue) for highlights + arrows
- Typography overlay: **SF Pro Display** or **Inter** for captions; **JetBrains Mono** for code captions
- Tone: confident, technical, clean. No emoji in headlines. No stock photography. No marketing fluff.

Tool recommendation: **Figma** (free) with the 1280×800 frame template. Use macOS browser chrome screenshots for authenticity.

---

## Screenshot 1 — Hero / Locator Result

**Goal:** Lead with the most "wow" moment — click → instant 5-locator output.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  HEADLINE (top-left, 56pt bold)                          │
│  Click any element.                                      │
│  Get production-ready Selenium locators in 3 seconds.    │
│                                                          │
│  ┌────────────────┐         ┌──────────────────┐         │
│  │                │         │  Spectara  │         │
│  │  Browser page  │  ───→   │   popup with     │         │
│  │  with login    │ arrow   │   5 locator      │         │
│  │  form, mouse   │  blue   │   cards stacked  │         │
│  │  on Sign In    │         │   "Best · ID"    │         │
│  │  button        │         │   etc.           │         │
│  └────────────────┘         └──────────────────┘         │
│                                                          │
│  [smart selenium logo]  Free MIT Core · Open-Core · No tracking │
└──────────────────────────────────────────────────────────┘
```

**Caption (80 char limit):** `Click any element — get the most stable locator, ranked by reliability.`

**Highlighted feature:** Smart Best-Locator pick.

**Visual hierarchy:**
1. Headline pulls the eye
2. Page → popup arrow flow shows the action
3. Footer badges add trust signals

---

## Screenshot 2 — Selenium Java Snippet

**Goal:** Show developers the actual code output they care about most.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  HEADLINE                                                │
│  Selenium Java, ready to paste.                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Spectara · Java tab                        │    │
│  │ ┌──────────────────────────────────────────────┐ │    │
│  │ │ // BUTTON — id                               │ │    │
│  │ │ WebElement loginButton = driver.findElement( │ │    │
│  │ │   By.id("login-submit"));                    │ │    │
│  │ │ loginButton.click();                         │ │    │
│  │ └──────────────────────────────────────────────┘ │    │
│  │           [ Copy ]                               │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Smart variable naming · Selenium 4 syntax · One click  │
└──────────────────────────────────────────────────────────┘
```

**Caption:** `Selenium Java snippet ready to paste into your test suite.`

**Highlight:** real generated code (use actual extension output, not mocked).

---

## Screenshot 3 — Page Object Model

**Goal:** Show the killer feature — a full POM class.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  HEADLINE                                                │
│  Full Page Object Model, written for you.                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Spectara · POM tab                         │    │
│  │ ┌──────────────────────────────────────────────┐ │    │
│  │ │ public class LoginPage {                     │ │    │
│  │ │                                              │ │    │
│  │ │   private final By emailInput =              │ │    │
│  │ │     By.id("email");                          │ │    │
│  │ │   private final By passwordInput =           │ │    │
│  │ │     By.id("password");                       │ │    │
│  │ │   private final By loginButton =             │ │    │
│  │ │     By.cssSelector("button.btn-primary");    │ │    │
│  │ │                                              │ │    │
│  │ │   public void setEmailInput(String v) { ... }│ │    │
│  │ │   public void clickLoginButton() { ... }     │ │    │
│  │ │ }                                            │ │    │
│  │ └──────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ← Multi-capture builds the full class in one session   │
└──────────────────────────────────────────────────────────┘
```

**Caption:** `Full Page Object Model class generated automatically.`

**Highlight:** Multi-capture POM regeneration.

---

## Screenshot 4 — Multi-Capture Workflow

**Goal:** Show the in-page floating panel + captures list — the "this is a real tool" moment.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  HEADLINE                                                │
│  Build a complete POM in one inspect session.            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Browser page (e.g. e-commerce form)             │    │
│  │  with floating panel top-right:                  │    │
│  │  ┌────────────────────────────────────┐          │    │
│  │  │ ● Multi mode · 4 captured          │          │    │
│  │  │   Click · ⌥ exact · P pause        │          │    │
│  │  │   [Pause]      [Done]              │          │    │
│  │  └────────────────────────────────────┘          │    │
│  │                                                  │    │
│  │  Three elements highlighted with blue outlines  │    │
│  │  (input, input, button)                         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ✓ Auto-promote  ✓ List detection  ✓ Pause mode         │
└──────────────────────────────────────────────────────────┘
```

**Caption:** `Multi-capture mode builds a complete POM in one inspect session.`

**Highlight:** Floating panel + multi-element workflow.

---

## Screenshot 5 — List Detection

**Goal:** Show the "smart" angle that competitors don't have.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  HEADLINE                                                │
│  Click one row. Get a List<WebElement>.                  │
│                                                          │
│  ┌────────────────┐         ┌──────────────────┐         │
│  │  Browser:      │         │ Spectara  │         │
│  │  ┌──────────┐  │         │ List card:      │         │
│  │  │ Row 1    │← │  ───→  │ "List · 12      │         │
│  │  │ Row 2    │  │ click  │  items"         │         │
│  │  │ Row 3    │  │        │                  │         │
│  │  │ ...      │  │        │ By.cssSelector  │         │
│  │  │ Row 12   │  │        │ = "table > tr"  │         │
│  │  └──────────┘  │        │                  │         │
│  └────────────────┘        │ + Java loop      │         │
│                            │   snippet        │         │
│                            └──────────────────┘         │
│                                                          │
│  Sibling pattern detected · Iteration code included     │
└──────────────────────────────────────────────────────────┘
```

**Caption:** `Click one item in a list — get a List<WebElement> locator instantly.`

**Highlight:** Auto-detection of collection patterns.

---

## Screenshot 6 — iframe Support (optional, slot 6)

**Goal:** Differentiator from competitors that ignore iframes.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  HEADLINE                                                │
│  Even works inside iframes — automatically.              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Code preview:                                    │    │
│  │ ┌──────────────────────────────────────────────┐ │    │
│  │ │ driver.switchTo().defaultContent();          │ │    │
│  │ │ driver.switchTo().frame(                     │ │    │
│  │ │   driver.findElement(                        │ │    │
│  │ │     By.cssSelector("iframe#payment")));      │ │    │
│  │ │ WebElement cardInput =                       │ │    │
│  │ │   driver.findElement(By.id("card-number"));  │ │    │
│  │ │ cardInput.sendKeys("YOUR_VALUE");            │ │    │
│  │ │ driver.switchTo().defaultContent();          │ │    │
│  │ └──────────────────────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Frame chain auto-detected · switchTo() calls included  │
└──────────────────────────────────────────────────────────┘
```

**Caption:** `iframe support: switchTo().frame() chains generated automatically.`

**Highlight:** The frame chain feature delivered in v1.3.

---

## Optional: Marquee Promo Tile (1400×560)

Editorial banner for "Editor's Picks" placement. Skip until accepted into editorial.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [Big logo]  SMART SELENIUM                              │
│              LOCATOR GENERATOR                           │
│                                                          │
│  Stop writing locators by hand. Click an element. Done. │
│                                                          │
│              Free Core · Open-Core · Manifest V3         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Production checklist for screenshots

- [ ] Use the actual extension UI — no mocks
- [ ] Run on a real demo site (e.g. https://the-internet.herokuapp.com or https://demoqa.com)
- [ ] macOS Chrome with light system chrome for clean borders
- [ ] Hide bookmark bar, hide unrelated tabs (Cmd+Shift+B, single tab)
- [ ] Use Chrome's built-in "Capture screenshot" via DevTools (Cmd+Shift+P → "Capture full size screenshot") or use CleanShot X
- [ ] Resize / crop to exactly 1280×800
- [ ] Save as PNG, optimize with TinyPNG or pngquant
- [ ] Each file < 1 MB

---

## Asset file names (when ready)

```
screenshots/
├── 01-hero-locator-result.png
├── 02-java-snippet.png
├── 03-page-object-model.png
├── 04-multi-capture.png
├── 05-list-detection.png
└── 06-iframe-support.png
```
