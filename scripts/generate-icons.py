#!/usr/bin/env python3
"""
generate-icons.py
Resize a master 1024x1024 PNG into the 4 icon sizes required by the
Chrome Web Store, using high-quality Lanczos resampling.

Usage:
    python3 scripts/generate-icons.py [path/to/master.png]

Default master path: assets/icon-master.png
"""

import sys
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.stderr.write(
        "Missing dependency: Pillow.\n"
        "Install with: pip3 install Pillow\n"
    )
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MASTER = REPO_ROOT / "assets" / "icon-master.png"
OUT_DIR = REPO_ROOT / "assets"

SIZES = [16, 32, 48, 128]

def main():
    master_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_MASTER
    if not master_path.exists():
        sys.stderr.write(f"Master icon not found: {master_path}\n")
        sys.stderr.write("Save your 1024x1024 PNG to assets/icon-master.png and rerun.\n")
        sys.exit(2)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = Image.open(master_path).convert("RGBA")

    if src.width != src.height:
        sys.stderr.write(
            f"Warning: master is not square ({src.width}x{src.height}). "
            "Square (e.g. 1024x1024) is strongly recommended.\n"
        )

    for size in SIZES:
        out = src.resize((size, size), Image.Resampling.LANCZOS)
        target = OUT_DIR / f"icon{size}.png"
        out.save(target, format="PNG", optimize=True)
        print(f"  wrote {target.relative_to(REPO_ROOT)} ({size}x{size})")

    print("done.")

if __name__ == "__main__":
    main()
