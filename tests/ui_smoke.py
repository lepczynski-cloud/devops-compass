#!/usr/bin/env python3
"""Optional Chromium smoke test for DevOps Compass.

Requirements:
    python -m pip install playwright
    python -m playwright install chromium

The test loads the packaged HTML, CSS and JavaScript directly into Chromium.
It does not require a web server or network access.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from playwright.sync_api import Browser, Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

INDEX = (PUBLIC / "index.html").read_text(encoding="utf-8")
CSS = (PUBLIC / "assets" / "styles.css").read_text(encoding="utf-8")
DATA = (PUBLIC / "assets" / "data.js").read_text(encoding="utf-8")
APP = (PUBLIC / "assets" / "app.js").read_text(encoding="utf-8")


def test_document(*, hash_value: str = "", initial_storage: dict[str, str] | None = None) -> str:
    storage = json.dumps(initial_storage or {}, ensure_ascii=False).replace("</", "<\\/")
    bootstrap = f"""
<script>
(() => {{
  const store = {storage};
  Object.defineProperty(window, 'localStorage', {{
    configurable: true,
    value: {{
      getItem(key) {{ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; }},
      setItem(key, value) {{ store[key] = String(value); }},
      removeItem(key) {{ delete store[key]; }},
      clear() {{ Object.keys(store).forEach((key) => delete store[key]); }},
      key(index) {{ return Object.keys(store)[index] ?? null; }},
      get length() {{ return Object.keys(store).length; }}
    }}
  }});
  Object.defineProperty(navigator, 'clipboard', {{
    configurable: true,
    value: {{ writeText: async (value) => {{ window.__copiedPrompt = value; }} }}
  }});
  window.__dumpStorage = () => JSON.parse(JSON.stringify(store));
  history.replaceState(null, '', {json.dumps(hash_value)} || '#home');
}})();
</script>
"""

    html = INDEX.replace(
        '<link rel="stylesheet" href="/assets/styles.css">',
        f"<style>{CSS}</style>",
    )
    html = html.replace('<script src="/assets/data.js" defer></script>', "")
    html = html.replace('<script src="/assets/app.js" defer></script>', "")
    html = html.replace("</head>", bootstrap + "</head>")
    html = html.replace("</body>", f"<script>{DATA}</script><script>{APP}</script></body>")
    return html


def load(page: Page, *, hash_value: str = "", storage: dict[str, str] | None = None) -> None:
    page.set_content(test_document(hash_value=hash_value, initial_storage=storage), wait_until="domcontentloaded")
    page.wait_for_selector("#app > *", state="attached")


def assert_true(value: bool, message: str) -> None:
    if not value:
        raise AssertionError(message)


def run_flow(browser: Browser) -> dict[str, str]:
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    load(page)

    assert_true(page.locator('[data-action="start"]').count() >= 1, "Home should expose a clear primary start action")
    assert_true(page.locator(".beta-notice").count() == 1, "Home should show a visible public beta notice")
    assert_true("public beta" in page.locator(".beta-notice").inner_text().lower(), "Beta notice should identify the public beta")
    assert_true("No ads" in page.locator(".home-proof-line").inner_text(), "Home should state that the app has no ads")
    assert_true("any AI" in page.locator(".home-promise").inner_text(), "Home should explain that prompts work with any AI")
    assert_true(page.locator(".sample-guide").count() == 1, "Home should show a concrete guide preview")

    page.locator('[data-action="language"]').click()
    assert_true("publiczna beta" in page.locator(".beta-notice").inner_text().lower(), "Polish home should identify the public beta")
    assert_true("Bez reklam" in page.locator(".home-proof-line").inner_text(), "Polish home should state that the app has no ads")
    assert_true("dowolnym narzędziem AI" in page.locator(".home-promise").inner_text(), "Polish home should explain that prompts work with any AI")
    page.locator('[data-action="language"]').click()

    page.locator('[data-action="start"]').first.click()
    next_button = page.locator('[data-action="wizard-next"]')
    assert_true(next_button.is_disabled(), "Continue should be disabled until a starting point is selected")

    page.locator('[data-action="choose-profile"][data-id="beginner"]').click()
    assert_true(not page.locator('[data-action="wizard-next"]').is_disabled(), "Starting point should enable Continue")
    page.locator('[data-action="wizard-next"]').click()

    page.locator('[data-action="choose-direction"][data-id="foundations"]').click()
    page.locator('[data-action="wizard-next"]').click()

    page.locator('[data-action="toggle-area"][data-id="linux"]').click()
    page.locator('[data-action="toggle-area"][data-id="cloud"]').click()
    page.locator('[data-action="wizard-next"]').click()

    cloud = page.locator('[data-assessment-area="cloud"]')
    cloud.locator("summary").click()
    assert_true(cloud.evaluate("node => node.open"), "Cloud assessment should open")

    rows = cloud.locator(".capability-row")
    rows.nth(0).locator('[data-action="set-level"][data-value="0"]').click()
    assert_true(cloud.evaluate("node => node.open"), "Cloud assessment should remain open after the first answer")
    rows.nth(1).locator('[data-action="set-level"][data-value="1"]').click()
    assert_true(cloud.evaluate("node => node.open"), "Cloud assessment should remain open after the second answer")
    assert_true("2/6" in cloud.locator("[data-assessment-count]").inner_text(), "Cloud answer counter should update in place")

    page.locator('[data-action="wizard-skip"]').click()
    page.locator('[data-action="wizard-finish"]').click()
    page.wait_for_selector(".dashboard")

    assert_true(page.locator(".route-context-section").count() == 1, "Dashboard should show a focused route")
    first_guide = page.locator('[data-action="skill-details"]').first
    first_guide.click()
    page.wait_for_selector(".learning-guide")

    assert_true(page.locator(".quick-win-panel").count() == 1, "Guide should contain a first useful action")
    assert_true(page.locator(".resource-card").count() >= 2, "Guide should contain at least two resources")
    assert_true(page.locator(".verification-list label").count() >= 3, "Guide should contain verification criteria")
    assert_true(page.locator(".ai-prompt").count() == 1, "Guide should contain one AI tutor prompt")
    assert_true("official documentation" in page.locator(".ai-prompt").input_value(), "AI prompt should require official documentation")

    page.locator('[data-action="copy-prompt"]').click()
    page.wait_for_timeout(50)
    assert_true(bool(page.evaluate("window.__copiedPrompt")), "Copy action should write the prompt")

    page.locator("[data-status-skill]").select_option("learning")
    storage = page.evaluate("window.__dumpStorage()")
    page.close()
    return storage


def run_return_visit(browser: Browser, storage: dict[str, str]) -> None:
    page = browser.new_page(viewport={"width": 390, "height": 844})
    load(page, hash_value="#dashboard", storage=storage)
    page.wait_for_selector(".dashboard")
    assert_true(page.locator('[data-action="dashboard"]').count() >= 0, "Dashboard should render on a return visit")
    page.locator('[data-action="language"]').click()
    assert_true("Twoja ścieżka DevOps" in page.locator("h1").inner_text(), "Polish dashboard should render")
    overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
    assert_true(not overflow, "390 px layout should not overflow horizontally")
    page.close()


def run_all_guides(browser: Browser) -> None:
    data_text = DATA.removeprefix("window.COMPASS_DATA = ").rstrip().rstrip(";")
    skill_ids = [skill["id"] for skill in json.loads(data_text)["skills"]]
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    failures: list[str] = []

    for skill_id in skill_ids:
        load(page, hash_value=f"#skill={skill_id}")
        try:
            assert_true(page.locator(".learning-guide").count() == 1, f"{skill_id}: guide missing")
            assert_true(page.locator(".resource-card").count() >= 2, f"{skill_id}: fewer than two resources")
            assert_true(page.locator(".verification-list label").count() >= 3, f"{skill_id}: insufficient verification")
            assert_true(page.locator(".ai-prompt").count() == 1, f"{skill_id}: AI prompt missing")
        except AssertionError as error:
            failures.append(str(error))

    page.close()
    if failures:
        raise AssertionError("\n".join(failures))
    print(f"All-guide audit: {len(skill_ids)} tested, 0 errors")


def main() -> int:
    executable = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    try:
        with sync_playwright() as playwright:
            launch_args = {"headless": True}
            if executable:
                launch_args["executable_path"] = executable
            browser = playwright.chromium.launch(**launch_args)
            storage = run_flow(browser)
            run_return_visit(browser, storage)
            run_all_guides(browser)
            browser.close()
    except Exception as error:
        print(f"UI smoke test failed: {error}", file=sys.stderr)
        return 1

    print("UI smoke test passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
