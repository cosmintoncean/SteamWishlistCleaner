"""Draws the icons (a broom and sparkles). No dependencies."""

import struct
import zlib
from pathlib import Path

BACKGROUND = (27, 40, 56)
LINE = (199, 213, 224)
ACCENT = (26, 159, 255)
BRISTLE = (255, 200, 87)
SAMPLES = 4  # per axis, for smooth edges

BRISTLES = ((0.39, 0.49), (0.53, 0.63), (0.47, 0.87), (0.32, 0.83), (0.19, 0.73), (0.13, 0.59))
BRISTLE_GAPS = ((0.42, 0.62, 0.30, 0.84), (0.37, 0.57, 0.17, 0.70))


def inside_polygon(x, y, points):
    inside = False
    for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1]):
        if (ay > y) != (by > y) and x < ax + (y - ay) * (bx - ax) / (by - ay):
            inside = not inside
    return inside


def distance(x, y, ax, ay, bx, by):
    """Distance from a point to the segment a-b."""
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    return ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2) ** 0.5


def colour(x, y):
    """Colour at a point of a 1x1 canvas, or None outside the rounded square."""
    corner = 0.2
    cx, cy = min(max(x, corner), 1 - corner), min(max(y, corner), 1 - corner)
    if (x - cx) ** 2 + (y - cy) ** 2 > corner**2:
        return None
    # A broom, leaning to the right, with sparkles where it has cleaned.
    if distance(x, y, 0.82, 0.17, 0.53, 0.49) < 0.05:  # handle
        return LINE
    if distance(x, y, 0.40, 0.45, 0.57, 0.61) < 0.048:  # band holding the bristles
        return ACCENT
    if inside_polygon(x, y, BRISTLES):
        if any(distance(x, y, *gap) < 0.014 for gap in BRISTLE_GAPS):
            return BACKGROUND
        return BRISTLE
    for centre_x, centre_y, radius in ((0.25, 0.26, 0.15), (0.76, 0.73, 0.11)):
        if abs(x - centre_x) ** 0.55 + abs(y - centre_y) ** 0.55 < radius**0.55:
            return ACCENT
    return BACKGROUND


def pixel(size, column, row):
    found = [
        colour((column + (i + 0.5) / SAMPLES) / size, (row + (j + 0.5) / SAMPLES) / size)
        for i in range(SAMPLES)
        for j in range(SAMPLES)
    ]
    inside = [c for c in found if c]
    if not inside:
        return bytes(4)
    rgb = [round(sum(c[k] for c in inside) / len(inside)) for k in range(3)]
    return bytes([*rgb, round(255 * len(inside) / len(found))])


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))


def png(size):
    rows = b"".join(
        b"\0" + b"".join(pixel(size, column, row) for column in range(size)) for row in range(size)
    )
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(rows, 9))
        + chunk(b"IEND", b"")
    )


root = Path(__file__).resolve().parents[1]
targets = {size: root / "browser" / "icons" / f"icon-{size}.png" for size in (16, 48, 128)}
targets[300] = root / "docs" / "store-logo-300.png"
for size, path in targets.items():
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png(size))
    print(path.relative_to(root))
