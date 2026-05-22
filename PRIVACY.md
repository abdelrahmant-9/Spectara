# Privacy Policy

**Smart Selenium Locator Generator**
**Effective date:** May 22, 2026
**Maintainer:** Abdelrahman Tarek (`abdelrahman.tarek.dev@gmail.com`)

---

## Summary in one sentence

This extension does not collect, transmit, store, sell, or share any personal information. Everything happens locally in your browser.

---

## 1. What data does this extension access?

When you click "Start Inspect" and then click an element on a webpage, the extension reads attributes from that element (such as `id`, `name`, `class`, `tag`, visible text, ARIA labels, and the element's path within the page) in order to compute locator strings and code snippets. This is done entirely inside the browser, in JavaScript, and the result is shown to you in the extension popup.

The extension also reads the URL of the current tab when generating a Page Object Model class name (e.g. `LoginPage` from `/login`).

---

## 2. What data is stored, and where?

The extension uses `chrome.storage.local` — Chrome's built-in local storage API — to remember:

- The list of recent captures (locators + generated code), so the popup can show them when reopened
- Your UI preferences (light/dark theme, single/multi mode)
- A first-run flag to show or hide the onboarding banner

This data is stored only on your own device, in the browser profile that has the extension installed. It is never transmitted off the device.

A storage cap of 100 most-recent captures is enforced so the extension's local storage never grows beyond a few hundred KB.

---

## 3. What data leaves the device?

**None.**

This extension makes no network requests of any kind. It does not contact any server operated by the maintainer or any third party. It contains no analytics SDK, no fingerprinting code, no remote-script loaders, and no telemetry. You can verify this by reading the source code:
[https://github.com/abdelrahmant-9/smart-selenium-locator-generator](https://github.com/abdelrahmant-9/smart-selenium-locator-generator)

The only network calls Chrome itself may make are unrelated to the extension's functionality (e.g. Chrome's own auto-update mechanism).

---

## 4. Permissions and why they exist

| Permission | Purpose |
|------------|---------|
| `activeTab` | Lets the popup talk to the content script on the current tab when you press Start / Stop / Pause. |
| `scripting` | Lets the popup inject the content scripts on pages that were already open before the extension was installed — without this, you would have to refresh every existing tab once. |
| `storage` | Lets the extension remember your captures and preferences between popup opens. |
| `host_permissions: <all_urls>` | The extension's purpose is to generate locators for any element on any page you choose to inspect. There is no way to restrict this to specific URLs in advance. **No content is ever transmitted off the device.** |

---

## 5. Cookies, advertising, third-party services

This extension uses:

- **No cookies**
- **No advertising networks**
- **No third-party analytics**
- **No third-party SDKs**
- **No external APIs**

---

## 6. Children's privacy

The extension is a developer tool and is not directed at children under 13. No data is collected from anyone regardless of age.

---

## 7. Changes to this policy

If this policy is updated, the effective date at the top will change and a notice will be added to the GitHub repository's README and CHANGELOG. Material changes will also be reflected in the Chrome Web Store listing.

---

## 8. Open-source verification

This extension is licensed under MIT and the full source code is public. You can audit every byte that runs on your machine:
[https://github.com/abdelrahmant-9/smart-selenium-locator-generator](https://github.com/abdelrahmant-9/smart-selenium-locator-generator)

To verify that no data leaves the device, you can open Chrome DevTools → Network tab while using the extension and confirm that no requests originate from the extension's runtime.

---

## 9. Contact

Questions, concerns, or data requests:

**Abdelrahman Tarek**
Email: `abdelrahman.tarek.dev@gmail.com`
GitHub Issues: [https://github.com/abdelrahmant-9/smart-selenium-locator-generator/issues](https://github.com/abdelrahmant-9/smart-selenium-locator-generator/issues)
