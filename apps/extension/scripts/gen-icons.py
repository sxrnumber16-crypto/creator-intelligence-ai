#!/usr/bin/env python3
"""Generate Creator Intelligence AI extension icons (16/32/48/128)."""
from PIL import Image, ImageDraw
import os

SIZES = [16, 32, 48, 128]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)


def rounded_rect_mask(size, radius_ratio=0.24):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    return mask


def make_icon(size):
    scale = 4  # supersample for smooth edges
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # Vertical gradient background: deep navy -> brand blue
    top = (14, 18, 27, 255)
    bottom = (2, 132, 199, 255)
    grad = Image.new("RGBA", (s, s))
    gd = ImageDraw.Draw(grad)
    for y in range(s):
        t = y / max(s - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(4))
        gd.line([(0, y), (s, y)], fill=color)

    mask = rounded_rect_mask(s)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)

    # Play-button triangle (YouTube nod) in white
    cx, cy = s * 0.50, s * 0.50
    tri_w, tri_h = s * 0.34, s * 0.40
    offset_x = tri_w * 0.08
    pts = [
        (cx - tri_w / 2 + offset_x, cy - tri_h / 2),
        (cx - tri_w / 2 + offset_x, cy + tri_h / 2),
        (cx + tri_w / 2 + offset_x, cy),
    ]
    d.polygon(pts, fill=(255, 255, 255, 255))

    # Rising intelligence bars bottom-left (accent)
    bar_h = [0.10, 0.16, 0.22]
    bar_w = s * 0.06
    gap = s * 0.035
    start_x = s * 0.16
    base_y = s * 0.84
    for i, h in enumerate(bar_h):
        x0 = start_x + i * (bar_w + gap)
        d.rounded_rectangle(
            [x0, base_y - s * h, x0 + bar_w, base_y],
            radius=bar_w * 0.4,
            fill=(125, 211, 252, 235),
        )

    img = img.resize((size, size), Image.LANCZOS)
    img.save(os.path.join(OUT, f"icon{size}.png"))


for size in SIZES:
    make_icon(size)
    print(f"icon{size}.png written")
