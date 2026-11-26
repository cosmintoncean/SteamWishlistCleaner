"""Makes the 1280x800 store screenshots in docs/store-screenshots.

Shows the real panel from dist/browser (build it first) with made-up sample games on a
plain background, rendered by Microsoft Edge in headless mode.
"""

import json
import struct
import subprocess
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
output = root / "docs" / "store-screenshots"
panel_script = (root / "dist" / "browser" / "content.js").read_text(encoding="utf-8")

EDGE = next(
    path
    for path in (
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    )
    if path.exists()
)

GAMES = [
    ("Copper Harbor", ["family"]),
    ("Lantern Keep", ["pcGamePass", "consoleGamePass"]),
    ("Moss and Machinery", ["psPlus"]),
    ("Orbit Gardeners", ["family", "pcGamePass"]),
    ("The Quiet Cartographer", ["psClassics"]),
]

# name: (headline, supporting text, buttons to click in order)
SHOTS = {
    "1-choose": (
        "Choose what to check",
        "Your Steam Family, Game Pass and PS Plus catalogs. Scanning changes nothing.",
        [],
    ),
    "2-review": (
        "Review every match",
        "See why each game matched. Keep any you still want.",
        ["Scan wishlist"],
    ),
    "3-confirm": (
        "Confirm before removing",
        "Nothing is removed until you click twice. You can undo your latest removal.",
        ["Scan wishlist", "Remove selected"],
    ),
}

PAGE = """<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; width: 1280px; height: 800px; overflow: hidden;
    background: linear-gradient(135deg, #0f1620, #1d3048); font-family: system-ui, sans-serif; }
  header { position: absolute; left: 80px; top: 250px; width: 560px; color: #f1f4f8; }
  h1 { margin: 0 0 20px; font-size: 52px; line-height: 1.1; }
  p.lead { margin: 0; font-size: 24px; line-height: 1.5; color: #b8c7d6; }
  header img { width: 88px; height: 88px; margin-bottom: 28px; }
  #sfwc-panel { zoom: 1.25; right: 48px !important; bottom: 24px !important; }
  #sfwc-panel .sfwc-body { width: 360px !important; max-height: none !important; }
  #sfwc-panel .sfwc-list { max-height: none !important; }
</style>
<body>
<header><img src="__ICON__" alt=""><h1>__TITLE__</h1><p class="lead">__TEXT__</p></header>
<script>
  const games = __GAMES__.map(([name, reasons], i) => ({ appid: i + 1, name, reasons }));
  window.chrome = {
    runtime: { sendMessage: async () =>
      ({ ok: true, result: { matches: games, wishlistCount: 42, warnings: [] } }) },
    storage: { local: {
      get: async (key) => ({ [key]: key === "options"
        ? { sources: ["family", "pcGamePass", "consoleGamePass", "psPlus", "psClassics"],
            country: "US" }
        : undefined }),
      set: async () => {},
    } },
  };
  window.fetch = async () =>
    ({ ok: true, json: async () => ({ data: { webapi_token: "sample" } }) });
  const realTimeout = window.setTimeout;
</script>
<script>__PANEL__</script>
<script>
  const panel = document.querySelector("#sfwc-panel");
  panel.querySelector(".sfwc-body").hidden = false;
  const pause = () => new Promise((resolve) => realTimeout(resolve, 100));
  (async () => {
    await pause();
    for (const label of __CLICKS__) {
      [...panel.querySelectorAll("button")]
        .find((button) => button.textContent.startsWith(label)).click();
      await pause();
    }
  })();
</script>
</body>
"""

output.mkdir(parents=True, exist_ok=True)
icon = (root / "browser" / "icons" / "icon-128.png").as_uri()
with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as folder:
    for name, (title, text, clicks) in SHOTS.items():
        page = Path(folder) / f"{name}.html"
        html = PAGE
        for key, value in {
            "__ICON__": icon,
            "__TITLE__": title,
            "__TEXT__": text,
            "__GAMES__": json.dumps(GAMES),
            "__CLICKS__": json.dumps(clicks),
            "__PANEL__": panel_script,
        }.items():
            html = html.replace(key, value)
        page.write_text(html, encoding="utf-8")
        target = output / f"{name}.png"
        subprocess.run(
            [
                str(EDGE),
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--force-device-scale-factor=1",
                "--window-size=1280,800",
                "--virtual-time-budget=4000",
                f"--user-data-dir={Path(folder) / 'profile'}",
                f"--screenshot={target}",
                page.as_uri(),
            ],
            check=True,
            timeout=90,
            capture_output=True,
        )
        width, height = struct.unpack(">II", target.read_bytes()[16:24])
        assert (width, height) == (1280, 800), (name, width, height)
        print(target.relative_to(root))
