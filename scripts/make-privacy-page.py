"""Turns PRIVACY.md into a standalone page to host publicly (the stores ask for its address).

Handles only the Markdown that PRIVACY.md uses: headings, paragraphs, bullet lists,
tables, bold, code and email addresses.
"""

import html
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]

STYLE = """
body { max-width: 46rem; margin: 0 auto; padding: 2rem 1rem; background: #07070c;
  color: #f1f0f7; font: 16px/1.6 Inter, system-ui, sans-serif; }
h1, h2 { font-family: "Space Grotesk", system-ui, sans-serif; line-height: 1.2; }
a { color: #ff8a3d; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: .5rem; border: 1px solid #2a2a38; text-align: left; vertical-align: top; }
code { overflow-wrap: anywhere; }
"""


def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    return re.sub(r"[\w.+-]+@[\w-]+\.[\w.]*\w", r'<a href="mailto:\g<0>">\g<0></a>', text)


def row(line, tag):
    cells = line.strip().strip("|").split("|")
    return "<tr>" + "".join(f"<{tag}>{inline(c.strip())}</{tag}>" for c in cells) + "</tr>"


def block(text):
    lines = text.splitlines()
    if lines[0].startswith("#"):
        level = len(lines[0]) - len(lines[0].lstrip("#"))
        return f"<h{level}>{inline(lines[0][level:].strip())}</h{level}>"
    if lines[0].startswith("|"):
        body = "".join(row(line, "td") for line in lines[2:])  # line 2 is the divider
        return f"<table>{row(lines[0], 'th')}{body}</table>"
    if lines[0].startswith("- "):
        items = re.split(r"^- ", text, flags=re.M)[1:]
        return "<ul>" + "".join(f"<li>{inline(' '.join(i.split()))}</li>" for i in items) + "</ul>"
    return f"<p>{inline(' '.join(text.split()))}</p>"


source = (root / "PRIVACY.md").read_text(encoding="utf-8").strip()
content = "\n".join(block(part) for part in re.split(r"\n\s*\n", source))
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wishlist Cleaner privacy policy</title>
<style>{STYLE}</style>
</head>
<body>
{content}
</body>
</html>
"""
target = root / "dist" / "release" / "privacy.html"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(page, encoding="utf-8", newline="\n")
print(target)
