"""Turns PRIVACY.md into the privacy page for comaapps.dev (the stores ask for its address).

The page is meant for `steam-wishlist-cleaner/privacy.html` in the website's repository and
uses the website's own fonts and app icon from `../assets/`, in the Steam store's blues. Elsewhere it falls back to
system fonts. Nothing is loaded from other sites.

Handles only the Markdown that PRIVACY.md uses: headings, a "Last updated" line,
paragraphs, bullet lists, tables, bold, code and email addresses.
"""

import html
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]

STYLE = """
:root { --bg: #171a21; --panel: #1b2838; --line: #2a475e; --text: #ffffff; --muted: #c7d5e0;
  --dim: #8f98a0; --link: #66c0f4; --blue: #1a9fff;
  --accent: linear-gradient(135deg, #66c0f4 0%, #1a9fff 100%);
  --display: "Space Grotesk", system-ui, sans-serif; --body: Inter, system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.65 var(--body);
  background-image: radial-gradient(60rem 32rem at 8% -8%, rgba(102, 192, 244, 0.22), transparent 70%),
    radial-gradient(56rem 34rem at 100% 0%, rgba(26, 159, 255, 0.16), transparent 70%);
  background-repeat: no-repeat; }
.wrap { max-width: 52rem; margin: 0 auto; padding: 0 1.25rem; }
a { color: var(--link); text-underline-offset: 3px; }
.hero { display: flex; align-items: center; gap: 1.5rem; padding: 3.5rem 0 2rem; }
.hero img { width: 88px; height: 88px; flex: none; }
.kicker { margin: 0 0 .25rem; font: 500 0.8rem var(--mono); letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--link); }
h1, h2 { font-family: var(--display); letter-spacing: -0.02em; line-height: 1.15; }
h1 { margin: 0; font-size: clamp(2rem, 6vw, 3rem); }
.updated { margin: .6rem 0 0; color: var(--dim); font-size: .9rem; }
.intro { margin: 0 0 1.5rem; font-size: 1.2rem; color: var(--muted); }
section { margin-bottom: 1rem; padding: 1.5rem 1.75rem; border: 1px solid var(--line);
  border-radius: 20px; background: var(--panel); }
h2 { margin: 0 0 .75rem; font-size: 1.35rem; }
section p, section ul { margin: 0 0 .75rem; color: var(--muted); }
section > :last-child { margin-bottom: 0; }
ul { padding: 0; list-style: none; }
li { position: relative; margin-bottom: .4rem; padding-left: 1.4rem; }
li::before { content: ""; position: absolute; left: .2rem; top: .65em; width: 7px; height: 7px;
  border-radius: 50%; background: var(--accent); }
strong { color: var(--text); }
code { font: 0.85em var(--mono); color: var(--text); overflow-wrap: anywhere; }
table { width: 100%; margin-bottom: 1rem; border-collapse: collapse; font-size: .94rem; }
th { padding: 0 .75rem .6rem 0; text-align: left; font: 500 .75rem var(--mono);
  letter-spacing: 0.06em; text-transform: uppercase; color: var(--dim); }
td { padding: .75rem .75rem .75rem 0; border-top: 1px solid var(--line); vertical-align: top;
  color: var(--muted); }
footer { padding: 1.5rem 0 3rem; color: var(--dim); font-size: .9rem; }
@media (max-width: 640px) {
  .hero { flex-direction: column; align-items: flex-start; padding-top: 2.5rem; }
  section { padding: 1.25rem; }
  thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  table, tbody, tr, td { display: block; }
  tr { padding: .75rem 0; border-top: 1px solid var(--line); }
  td { padding: .15rem 0; border: 0; }
  td::before { content: attr(data-label); display: block; font: 500 .7rem var(--mono);
    letter-spacing: 0.06em; text-transform: uppercase; color: var(--dim); }
}
"""


def inline(text):
    text = html.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    return re.sub(r"[\w.+-]+@[\w-]+\.[\w.]*\w", r'<a href="mailto:\g<0>">\g<0></a>', text)


def cells(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def block(text):
    lines = text.splitlines()
    if lines[0].startswith("|"):
        headings = cells(lines[0])
        head = "".join(f'<th scope="col">{inline(cell)}</th>' for cell in headings)
        rows = "".join(  # line 2 of a Markdown table is the divider
            "<tr>"
            + "".join(
                f'<td data-label="{html.escape(label)}">{inline(cell)}</td>'
                for label, cell in zip(headings, cells(line))
            )
            + "</tr>"
            for line in lines[2:]
        )
        return f"<table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>"
    if lines[0].startswith("- "):
        items = re.split(r"^- ", text, flags=re.M)[1:]
        return "<ul>" + "".join(f"<li>{inline(' '.join(i.split()))}</li>" for i in items) + "</ul>"
    return f"<p>{inline(' '.join(text.split()))}</p>"


# PRIVACY.md: title, "Last updated" line, introduction, then one "## " heading per card.
source = (root / "PRIVACY.md").read_text(encoding="utf-8").strip()
parts = re.split(r"\n\s*\n", source)
title, updated = parts[0].lstrip("# ").strip(), parts[1]
assert updated.startswith("Last updated"), "PRIVACY.md needs a 'Last updated' line"
intro, sections = [], []
for part in parts[2:]:
    if part.startswith("## "):
        sections.append([f"<h2>{inline(part[3:].strip())}</h2>"])
    elif sections:
        sections[-1].append(block(part))
    else:
        intro.append(inline(" ".join(part.split())))

cards = "\n".join("<section>\n" + "\n".join(section) + "\n</section>" for section in sections)
introduction = "\n".join(f'<p class="intro">{paragraph}</p>' for paragraph in intro)
page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Steam Wishlist Cleaner privacy policy</title>
<meta name="description" content="What Steam Wishlist Cleaner reads, where requests go and what is stored.">
<meta name="theme-color" content="#171a21">
<link rel="icon" href="../assets/steam-wishlist-cleaner-icon.png">
<link rel="stylesheet" href="../assets/fonts.css">
<style>{STYLE}</style>
</head>
<body>
<main class="wrap">
<div class="hero">
<img src="../assets/steam-wishlist-cleaner-icon.png" alt="" width="88" height="88">
<div>
<p class="kicker">Steam Wishlist Cleaner</p>
<h1>{inline(title)}</h1>
<p class="updated">{inline(updated)}</p>
</div>
</div>
{introduction}
{cards}
</main>
<footer class="wrap">&copy; 2026 Coma Apps. Not affiliated with Valve, Microsoft or Sony.</footer>
</body>
</html>
"""
target = root / "dist" / "release" / "privacy.html"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(page, encoding="utf-8", newline="\n")
print(target)
