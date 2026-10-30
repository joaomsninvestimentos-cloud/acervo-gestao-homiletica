#!/usr/bin/env python3
"""Gera icones PNG do launcher a partir do SVG (sem imagem padrao do Capacitor)."""
from pathlib import Path
import struct
import zlib

OUT = Path("android/app/src/main/res")
SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def pixel(x, y, size):
    n = x / (size - 1)
    m = y / (size - 1)
    r = int(27 + (15 - 27) * n)
    g = int(42 + (23 - 42) * m)
    b = int(74 + (42 - 74) * n)
    cx, cy = size / 2, size / 2
    dx, dy = x - cx, y - cy
    book = abs(dx) < size * 0.28 and abs(dy) < size * 0.32
    cross_v = abs(dx) < size * 0.035 and dy < size * 0.08 and dy > -size * 0.28
    cross_h = abs(dy + size * 0.12) < size * 0.035 and abs(dx) < size * 0.12
    if cross_v or cross_h:
        return (229, 184, 91, 255)
    if book:
        return (250, 247, 242, 255)
    return (r, g, b, 255)


def write_png(path, size):
    raw = b"".join(
        b"\x00" + bytes(ch for x in range(size) for ch in pixel(x, y, size))
        for y in range(size)
    )

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def main():
    for folder, size in SIZES.items():
        d = OUT / folder
        write_png(d / "ic_launcher.png", size)
        write_png(d / "ic_launcher_round.png", size)
        write_png(d / "ic_launcher_foreground.png", size)
    print("icons generated")


if __name__ == "__main__":
    main()
