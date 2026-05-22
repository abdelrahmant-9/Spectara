#!/usr/bin/env bash
#
# generate-icons.sh
# Resize assets/icon-master.png into the 4 Chrome Web Store sizes.
# Prefers `sips` on macOS; falls back to ImageMagick `magick` elsewhere.
#
# Usage:
#   bash scripts/generate-icons.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/assets/icon-master.png"
OUT_DIR="$REPO_ROOT/assets"

if [[ ! -f "$SRC" ]]; then
  echo "Master icon not found: $SRC" >&2
  echo "Save your 1024x1024 PNG to assets/icon-master.png and rerun." >&2
  exit 2
fi

# Pick a resizer that exists on this system
RESIZER=""
if command -v sips >/dev/null 2>&1; then
  RESIZER="sips"
elif command -v magick >/dev/null 2>&1; then
  RESIZER="magick"
elif command -v convert >/dev/null 2>&1; then
  RESIZER="convert"
else
  echo "No image resizer found. Install one of:" >&2
  echo "  - macOS: built-in sips (you already have it on macOS, this is unusual)" >&2
  echo "  - ImageMagick: brew install imagemagick" >&2
  echo "  - Python Pillow: pip3 install Pillow && python3 scripts/generate-icons.py" >&2
  exit 3
fi

for SIZE in 16 32 48 128; do
  OUT="$OUT_DIR/icon${SIZE}.png"
  case "$RESIZER" in
    sips)    sips -z "$SIZE" "$SIZE" "$SRC" --out "$OUT" >/dev/null ;;
    magick)  magick "$SRC" -resize "${SIZE}x${SIZE}" "$OUT" ;;
    convert) convert "$SRC" -resize "${SIZE}x${SIZE}" "$OUT" ;;
  esac
  printf "  wrote assets/icon%s.png\n" "$SIZE"
done

echo "done."
