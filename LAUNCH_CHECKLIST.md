# Pre-Launch Checklist — Chrome Web Store

Use this as a single source of truth before clicking "Submit for review". Tick boxes in order.

---

## 1. Repository hygiene

- [ ] `package.json` (none needed — zero dependencies)
- [ ] `LICENSE` present (MIT, root)
- [ ] `README.md` updated with v1.3 features
- [ ] `PROJECT_PROFILE.md` reflects current version
- [ ] `STORE_ASSETS.md` ready to copy-paste into the Chrome Web Store form
- [ ] `SCREENSHOT_PLAN.md` reviewed
- [ ] `PRIVACY.md` published on the repo and a hosted public URL (use GitHub Pages or render via `gh-pages` branch)
- [ ] `.gitignore` covers `*.zip`, `*.crx`, build artifacts
- [ ] CHANGELOG.md (recommended, otherwise reuse Release Notes section of STORE_ASSETS.md)
- [ ] `git tag v1.3.0` + `git push origin v1.3.0`
- [ ] GitHub release created from the tag with the release notes from STORE_ASSETS.md

---

## 2. Icon files

- [ ] Save chosen master at `assets/icon-master.png` (1024×1024 PNG, transparent background)
- [ ] Run `python3 scripts/generate-icons.py`
- [ ] Verify `assets/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` all updated
- [ ] Visual check: open each file, confirm crisp edges + readable Selenium "Se" mark at 16×16
- [ ] Confirm transparency renders correctly on dark browser theme (chrome://extensions in dark mode)
- [ ] Commit + push

---

## 3. Manifest verification

- [ ] `manifest_version: 3`
- [ ] `version: "1.3.0"`
- [ ] `name`, `short_name`, `description` filled
- [ ] `permissions`: only `activeTab`, `scripting`, `storage`
- [ ] `host_permissions`: `<all_urls>` (justified in submission form)
- [ ] `content_scripts` has `all_frames: true` + `match_about_blank: true`
- [ ] `background.service_worker` points to `background/background.js`
- [ ] `action.default_icon` declares 16/32/48/128
- [ ] `icons` block declares 16/32/48/128
- [ ] `commands._execute_action` keyboard shortcut declared
- [ ] `minimum_chrome_version: "116"`
- [ ] `homepage_url` points to public GitHub
- [ ] No `web_accessible_resources` unless required
- [ ] JSON validates (`python3 -c "import json; json.load(open('manifest.json'))"`)

---

## 4. Functional smoke testing

Run a clean install and verify each feature on at least one site:

- [ ] Load unpacked → extension appears with correct icon
- [ ] Click toolbar icon → popup opens at 380px wide, no layout breakage
- [ ] First-run onboarding banner appears, dismissible
- [ ] Press `Ctrl/Cmd + Shift + L` → popup opens
- [ ] Single mode: click "Start Inspect" → popup auto-closes
- [ ] Hover any element → blue outline follows cursor
- [ ] Click element → one click captures (no need for second click)
- [ ] Reopen popup → Locators / Java / POM / Element tabs all populate
- [ ] Copy buttons work on every card (verified by paste-into-text-editor)
- [ ] Toggle theme → preference persists across popup reopens
- [ ] Multi-capture: switch tab → click 5 elements → counter shows "5 captured"
- [ ] Done button on floating panel ends session
- [ ] Captures strip shows 5 entries with remove × buttons
- [ ] POM tab shows combined class with all 5 elements
- [ ] List detection: click one row of a real table (e.g. https://demoqa.com/webtables) → List card appears with count
- [ ] iframe: open page with iframe (e.g. https://the-internet.herokuapp.com/iframe) → click element inside → Element tab shows Frame chain, Java snippet has `switchTo().frame(...)`
- [ ] Pause mode: P key toggles, button color changes orange, hint text updates
- [ ] ALT+click captures exact node (verify by clicking inside an SVG)
- [ ] ESC stops inspect
- [ ] Try `chrome://extensions` → popup shows clear error message (no inspect attempt)
- [ ] Try `https://chromewebstore.google.com` → popup shows clear error message

---

## 5. Cross-browser / cross-platform sanity

- [ ] macOS Chrome (latest) — primary
- [ ] Windows Chrome (latest) — verify keyboard hints show `Alt` not `⌥`
- [ ] Linux Chrome (latest) — visual regression check
- [ ] Chrome Beta — verify upcoming policy compatibility
- [ ] Edge (Chromium) — extension should load via "Load unpacked" with no changes
- [ ] Brave / Arc — basic smoke test (same engine, low risk)

---

## 6. Performance + memory

- [ ] Load on a page with 5,000+ DOM nodes (e.g. a long Wikipedia article) → inspect mode response < 100ms
- [ ] Multi-capture 20 elements in a row → no UI lag
- [ ] Open `chrome://extensions` → click "Service worker" inspect → verify SW idle (terminates after ~30s of inactivity)
- [ ] Open `chrome://memory-internals` → extension's memory usage should be < 30 MB even after extensive use
- [ ] Run Chrome DevTools Network tab while using inspector → confirm **zero outgoing requests** from the extension

---

## 7. Packaging

- [ ] `git clean -fxd` to remove all untracked files
- [ ] Re-run icon generation
- [ ] Re-run JSON validation
- [ ] Build the upload ZIP:
  ```bash
  cd /Users/abdelrahmantarek/smart-locator-generator
  zip -r spectara-v1.3.0.zip \
    manifest.json \
    background/ \
    content/ \
    popup/ \
    utils/ \
    assets/icon16.png assets/icon32.png assets/icon48.png assets/icon128.png \
    -x "*.DS_Store" "*/.git/*" "scripts/*" "*.md"
  ```
- [ ] ZIP size < 1 MB (target: < 200 KB)
- [ ] Extract ZIP to a temp folder → load unpacked → re-run smoke test from section 4

---

## 8. Chrome Web Store submission

- [ ] Pay the **$5 one-time** developer fee at https://chrome.google.com/webstore/devconsole/
- [ ] Click "New item" → upload `spectara-v1.3.0.zip`
- [ ] **Store listing tab:**
  - [ ] Title from STORE_ASSETS.md §1
  - [ ] Short description from §2
  - [ ] Detailed description from §3
  - [ ] Category: Developer Tools
  - [ ] Language: English
  - [ ] At least 1 screenshot (target: all 5 from SCREENSHOT_PLAN.md)
  - [ ] Icon: 128×128 already in manifest, also upload separately if prompted
  - [ ] Promo small tile 440×280 (optional but recommended)
- [ ] **Privacy practices tab:**
  - [ ] Single-purpose description from STORE_ASSETS.md §11
  - [ ] Permission justifications from §12
  - [ ] Privacy policy URL: hosted PRIVACY.md (GitHub Pages)
  - [ ] Data collection answers from §13: all "No"
  - [ ] Three certifications: all "Yes"
- [ ] **Distribution tab:**
  - [ ] Visibility: Public
  - [ ] Pricing: Free
  - [ ] Countries: All (or restrict if needed)
- [ ] Click "Submit for review"

---

## 9. Post-submission

- [ ] Save the submission confirmation email
- [ ] Expect 1-7 days review window
- [ ] Monitor the developer dashboard for review status
- [ ] If rejected: read the rejection reason carefully, fix, resubmit with notes in the developer notes field
- [ ] Once approved:
  - [ ] Update README badge: replace "Coming Soon" with Chrome Web Store link
  - [ ] LinkedIn announcement using launch post from earlier session
  - [ ] Submit to Product Hunt (Tuesday 12:01 AM PT for max algorithm boost)
  - [ ] Post to r/QualityAssurance, r/softwaretesting, r/Selenium with a humble "I built this" tone
  - [ ] Write a dev.to article: "How I built a Chrome extension for QA"
  - [ ] Pin the repo on your GitHub profile

---

## 10. Day-1 monitoring

- [ ] Reply to every comment within 1 hour on launch day (LinkedIn / Product Hunt algorithm boost)
- [ ] Monitor Chrome Web Store reviews tab — respond to all feedback within 24 hours
- [ ] Set up GitHub Issue templates so bug reports come in cleanly
- [ ] Set up a public roadmap (GitHub Projects board or Trello)

---

## 11. Rollback plan (in case of critical bug)

If a critical issue surfaces after launch:

1. Bump version to `1.3.1` in `manifest.json`
2. Patch the bug
3. Run sections 4 (smoke) + 7 (packaging) again
4. Upload new ZIP to the same item in the developer dashboard
5. Expedited reviews are usually 1-2 days for patch versions
6. Push the fix to the `main` branch + tag `v1.3.1` on GitHub
