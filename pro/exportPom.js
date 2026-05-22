/**
 * pro/exportPom.js
 *
 * Pro feature: download the generated Page Object Model as a real
 * .java file with a derived filename.
 *
 * Loaded lazily by popup.js loadProModules() only when a valid
 * license is detected. Free users never download or execute this code.
 *
 * Public API:
 *   export function init(api)   — hooks into popup state via proApi
 */

export function init(api) {
  const btn = api.els.exportJavaBtn;
  if (!btn) return;

  // Unlock the button: drop the Pro pill, swap label, enable click handler
  btn.classList.remove("pro-locked");
  const pill = btn.querySelector(".pro-pill");
  if (pill) pill.remove();
  btn.textContent = "Export .java";
  btn.removeAttribute("data-pro-feature");

  btn.addEventListener("click", () => {
    const pomEl = document.getElementById("pom-code");
    const code = pomEl ? (pomEl.textContent || "").trim() : "";
    if (!code || code === "—") {
      api.showToast("Nothing to export yet", true);
      return;
    }
    const className = extractClassName(code) || "GeneratedPage";
    const filename = `${className}.java`;
    triggerDownload(filename, code);
    api.showToast(`Saved ${filename}`);
  });
}

/**
 * Extract the public class name from a Java source string.
 * Falls back to "GeneratedPage" when no declaration is found.
 */
function extractClassName(java) {
  const m = java.match(/\bpublic\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
  return m ? m[1] : null;
}

/**
 * Trigger a browser-native file download from a string. Uses a Blob
 * URL + an anonymous <a download> click so no permissions or remote
 * URLs are required.
 */
function triggerDownload(filename, content) {
  const blob = new Blob([content], { type: "text/x-java-source;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after the next tick — browser may still be reading the URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
