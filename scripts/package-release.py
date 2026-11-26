"""Builds the release zips in dist/release from already built files."""

import hashlib
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]


def version_in(path):
    text = (root / path).read_text(encoding="utf-8")
    if path.endswith(".toml"):
        return re.search(r'^version = "([^"]+)"', text, re.M).group(1)
    return json.loads(text)["version"]


versions = {
    path: version_in(path)
    for path in (
        "package.json",
        "browser/manifest.source.json",
        "decky/package.json",
        "millennium/millennium.toml",
    )
}
if len(set(versions.values())) != 1:
    raise SystemExit(f"Version numbers differ: {versions}")
version = versions["package.json"]

browser = root / "dist" / "browser"
extra = [root / "LICENSE", root / "THIRD_PARTY_NOTICES.md", root / "PRIVACY.md"]
decky = root / "decky"
packages = {
    # Browser stores expect manifest.json at the top of the zip.
    f"wishlist-cleaner-browser-{version}.zip": [
        (path, path.relative_to(browser).as_posix())
        for path in sorted(browser.rglob("*"))
        if path.is_file()
    ],
    f"wishlist-cleaner-decky-{version}.zip": [
        (decky / name, f"wishlist-cleaner/{name}")
        for name in ("plugin.json", "package.json", "main.py", "dist/index.js")
    ]
    + [(path, f"wishlist-cleaner/{path.name}") for path in [*extra, root / "README.md"]],
}

release = root / "dist" / "release"
release.mkdir(parents=True, exist_ok=True)
for old in release.iterdir():
    old.unlink()
sums = []
for name, files in packages.items():
    with ZipFile(release / name, "w", ZIP_DEFLATED) as archive:
        for source, target in files:
            archive.write(source, target)
    sums.append(f"{hashlib.sha256((release / name).read_bytes()).hexdigest()}  {name}")
    print(release / name)
(release / "SHA256SUMS.txt").write_text("\n".join(sums) + "\n", encoding="utf-8", newline="\n")
