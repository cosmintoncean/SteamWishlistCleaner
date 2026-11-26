"""Makes the 1280x800 store screenshots in docs/store-screenshots, and the 440x280
Chrome Web Store tile.

Shows the real panel from dist/browser (build it first) with made-up sample games on a
plain background, rendered by Microsoft Edge in headless mode.
"""

import json
import struct
import subprocess
import tempfile
import zlib
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

def crop_png(source, target, width, height):
    """Keeps the top-left corner of an 8-bit RGB or RGBA PNG, saved without transparency."""
    data = source.read_bytes()
    full_width = struct.unpack(">I", data[16:20])[0]
    step = {2: 3, 6: 4}[data[25]]
    packed, offset = b"", 8
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        if data[offset + 4 : offset + 8] == b"IDAT":
            packed += data[offset + 8 : offset + 8 + length]
        offset += length + 12
    raw = zlib.decompress(packed)
    stride = full_width * step
    previous = bytearray(stride)
    rows = []
    for y in range(height):
        start = y * (stride + 1)
        kind, line = raw[start], bytearray(raw[start + 1 : start + 1 + stride])
        for i in range(stride):  # undo the PNG row filter
            a = line[i - step] if i >= step else 0
            b = previous[i]
            c = previous[i - step] if i >= step else 0
            if kind == 1:
                line[i] = (line[i] + a) & 255
            elif kind == 2:
                line[i] = (line[i] + b) & 255
            elif kind == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                nearest = min((a, b, c), key=lambda v: abs(p - v))
                line[i] = (line[i] + nearest) & 255
        previous = line
        rows.append(b"\0" + b"".join(bytes(line[x * step : x * step + 3]) for x in range(width)))

    def chunk(kind, body):
        crc = zlib.crc32(kind + body)
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", crc)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    target.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
        + chunk(b"IEND", b"")
    )


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

    # The small promotional tile: the logo only, as the store recommends little or no text.
    tile = Path(folder) / "tile.html"
    tile.write_text(
        "<!doctype html><meta charset='utf-8'><body style='margin:0'>"
        "<div style='width:440px;height:280px;display:grid;place-items:center;"
        "background:linear-gradient(135deg,#1a9fff,#16202d 75%)'>"
        f"<img src='{(root / 'docs' / 'store-logo-300.png').as_uri()}' "
        "style='width:190px;height:190px;filter:drop-shadow(0 10px 24px rgba(0,0,0,.5))'></div>",
        encoding="utf-8",
    )
    target = root / "docs" / "store-tile-440x280.png"
    # Headless Edge won't open a window this small, so render larger and crop.
    full = Path(folder) / "tile.png"
    subprocess.run(
        [
            str(EDGE),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=800,600",
            "--virtual-time-budget=4000",
            f"--user-data-dir={Path(folder) / 'profile'}",
            f"--screenshot={full}",
            tile.as_uri(),
        ],
        check=True,
        timeout=90,
        capture_output=True,
    )
    crop_png(full, target, 440, 280)
    print(target.relative_to(root))
