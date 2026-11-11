"""
build-fonts.py — subset the source fonts to WOFF2 and write src/styles/fonts.css.

Run once, and again only when the glyph set or the source fonts change:

    python -m venv .venv-fonts
    .venv-fonts/Scripts/python -m pip install fonttools brotli     (Windows)
    .venv-fonts/Scripts/python -I scripts/build-fonts.py

The outputs (src/assets/fonts/*.woff2, src/styles/fonts.css) are committed, so
a normal site build needs neither Python nor the network.

What it does, per face:
  1. Pins a variable font to one weight.
  2. Subsets to the glyphs this site sets, keeping the OpenType features it uses.
  3. Renames the D-DIN subset. "D-DIN" is a Reserved Font Name under the SIL
     OFL 1.1, and a subset is a Modified Version, so it may not keep the name.
  4. Writes an @font-face rule with explicit ascent/descent overrides chosen so
     that capitals sit on the optical centre of the line box, plus fallback
     faces (Arial, Roboto, Courier New) scaled to the same average advance
     width and the same line box, so the swap moves nothing.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "fonts"
OUT = ROOT / "src" / "assets" / "fonts"
CSS = ROOT / "src" / "styles" / "fonts.css"

# ── Glyph sets ───────────────────────────────────────────────────────────────

ASCII = list(range(0x20, 0x7F))
LATIN_1 = [0xA0, 0xA7, 0xA9, 0xAB, 0xB0, 0xB1, 0xB5, 0xB7, 0xBB, 0xD7, 0xF7] + list(range(0xC0, 0x100))
TYPOGRAPHIC = [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026]
TECHNICAL = [0x2032, 0x2033, 0x2190, 0x2191, 0x2192, 0x2193, 0x2197, 0x2212, 0x2248, 0x2264, 0x2265]
SHAPES = [0x25A0, 0x25A1, 0x25CF, 0x25CB, 0x25B2]

DISPLAY_SET = ASCII + LATIN_1 + TYPOGRAPHIC
TEXT_SET = ASCII + LATIN_1 + TYPOGRAPHIC + TECHNICAL
MONO_SET = ASCII + LATIN_1 + TYPOGRAPHIC + TECHNICAL + SHAPES

# English letter frequencies with the word space, as used by Capsize to
# estimate the average advance of running text.
FREQ = {
    "a": 0.0668, "b": 0.0122, "c": 0.0228, "d": 0.0348, "e": 0.1039, "f": 0.0182,
    "g": 0.0165, "h": 0.0499, "i": 0.0570, "j": 0.0013, "k": 0.0063, "l": 0.0329,
    "m": 0.0197, "n": 0.0552, "o": 0.0614, "p": 0.0158, "q": 0.0008, "r": 0.0490,
    "s": 0.0518, "t": 0.0741, "u": 0.0226, "v": 0.0080, "w": 0.0193, "x": 0.0012,
    "y": 0.0162, "z": 0.0006, " ": 0.1818,
}


@dataclass(frozen=True)
class Fallback:
    """A system font, measured with the same weighting (see measure_system())."""

    family: str
    local: tuple[str, ...]
    lower: float  # average advance, lowercase running text, in em
    upper: float  # the same for all-capitals text
    ascent: float
    descent: float


# Measured from the fonts shipped with Windows 11 and from Roboto 3 (Google Fonts).
ARIAL = Fallback("Arial", ("Arial", "ArialMT"), 0.4411, 0.5953, 0.9053, 0.2119)
ARIAL_BOLD = Fallback("Arial Bold", ("Arial Bold", "Arial-BoldMT"), 0.4769, 0.6018, 0.9053, 0.2119)
ROBOTO = Fallback("Roboto", ("Roboto", "Roboto-Regular"), 0.4424, 0.5500, 0.9277, 0.2441)
ROBOTO_BOLD = Fallback("Roboto Bold", ("Roboto Bold", "Roboto-Bold"), 0.4483, 0.5561, 0.9277, 0.2441)
# Courier New, Menlo, Roboto Mono, Droid Sans Mono and DejaVu Sans Mono all advance 0.600 em.
COURIER = Fallback(
    "Courier New",
    ("Courier New", "CourierNewPSMT", "Menlo", "Menlo-Regular", "Roboto Mono", "Droid Sans Mono", "DejaVu Sans Mono"),
    0.6001, 0.6001, 0.8325, 0.3003,
)


@dataclass(frozen=True)
class Face:
    source: str
    out: str
    family: str
    weight: int
    unicodes: list[int]
    features: list[str]
    case: str  # "upper" if the face is only ever set in capitals, else "lower"
    ascent: float  # line box above the baseline, in em
    descent: float  # line box below the baseline, in em
    fallbacks: tuple[tuple[str, Fallback], ...]
    pin: dict[str, float] | None = None
    rename: tuple[str, str, str] | None = None  # (family, style, postscript)
    hinting: bool = False


# Ascent and descent are set so that (ascent - capHeight) == descent: capitals
# are centred in the content area, which centres them in any line box.
#   D-DIN     cap height 0.690 em  ->  0.845 / 0.155
#   Overpass  cap height 0.700 em  ->  0.950 / 0.250
FACES = [
    Face(
        source="D-DIN-Bold.ttf",
        out="ck-din-700.woff2",
        family="CK DIN",
        weight=700,
        unicodes=DISPLAY_SET,
        features=["kern", "mark"],
        case="upper",
        ascent=0.845,
        descent=0.155,
        fallbacks=(("CK DIN Fallback", ARIAL_BOLD), ("CK DIN Fallback Android", ROBOTO_BOLD)),
        rename=("CK DIN", "Bold", "CKDIN-Bold"),
        hinting=True,
    ),
    Face(
        source="Overpass[wght].ttf",
        out="overpass-400.woff2",
        family="Overpass",
        weight=400,
        unicodes=TEXT_SET,
        features=["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "case", "tnum", "pnum", "zero"],
        case="lower",
        ascent=0.950,
        descent=0.250,
        fallbacks=(("Overpass Fallback", ARIAL), ("Overpass Fallback Android", ROBOTO)),
        pin={"wght": 400},
    ),
    Face(
        source="OverpassMono[wght].ttf",
        out="overpass-mono-400.woff2",
        family="Overpass Mono",
        weight=400,
        unicodes=MONO_SET,
        features=["ccmp", "locl", "mark", "mkmk", "case", "zero"],
        case="lower",
        ascent=0.950,
        descent=0.250,
        fallbacks=(("Overpass Mono Fallback", COURIER),),
        pin={"wght": 400},
    ),
]


def average_advance(font: TTFont, upper: bool) -> float:
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    total = 0.0
    weight = 0.0
    for char, share in FREQ.items():
        glyph = cmap.get(ord(char.upper() if upper else char))
        if glyph is None:
            continue
        total += hmtx[glyph][0] * share
        weight += share
    return total / weight / font["head"].unitsPerEm


def rename(font: TTFont, family: str, style: str, postscript: str, origin: str) -> None:
    names = font["name"]
    full = f"{family} {style}"
    replacements = {1: family, 2: style, 3: f"{full}; subset of {origin}", 4: full, 6: postscript, 16: family, 17: style}
    for record in list(names.names):
        if record.nameID in replacements:
            record.string = replacements[record.nameID]
    names.setName(
        f"Subset of {origin} by Datto Inc. Renamed because D-DIN is a Reserved Font Name under the SIL Open Font License 1.1.",
        10, 3, 1, 0x409,
    )


def build(face: Face) -> tuple[int, float]:
    font = TTFont(SRC / face.source)
    if face.pin:
        font = instancer.instantiateVariableFont(font, face.pin, inplace=False)

    options = subset.Options()
    options.layout_features = face.features
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 10, 13, 14, 16, 17]
    options.name_languages = [0x409]
    options.notdef_outline = True
    options.glyph_names = False
    options.hinting = face.hinting
    options.legacy_kern = False
    options.drop_tables += ["DSIG", "STAT", "MVAR", "meta"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=face.unicodes)
    subsetter.subset(font)

    if face.rename:
        rename(font, *face.rename, origin=Path(face.source).stem)
    elif face.pin:
        # A pinned instance keeps the variable font's default style name. Correct it.
        names = font["name"]
        plain = {1: face.family, 2: "Regular", 4: f"{face.family} Regular", 6: face.family.replace(" ", "") + "-Regular", 16: face.family, 17: "Regular"}
        for record in list(names.names):
            if record.nameID in plain:
                record.string = plain[record.nameID]

    font.flavor = "woff2"
    buffer = io.BytesIO()
    font.save(buffer)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / face.out).write_bytes(buffer.getvalue())
    return len(buffer.getvalue()), average_advance(font, face.case == "upper")


def pct(value: float) -> str:
    return f"{value * 100:.2f}%".replace(".00%", "%")


def rule(face: Face, advance: float) -> str:
    lines = [
        "@font-face {",
        f'  font-family: "{face.family}";',
        f'  src: url("../assets/fonts/{face.out}") format("woff2");',
        f"  font-weight: {face.weight};",
        "  font-style: normal;",
        "  font-display: swap;",
        f"  ascent-override: {pct(face.ascent)};",
        f"  descent-override: {pct(face.descent)};",
        "  line-gap-override: 0%;",
        "}",
    ]
    for name, fallback in face.fallbacks:
        measured = fallback.upper if face.case == "upper" else fallback.lower
        adjust = advance / measured
        sources = ", ".join(f'local("{n}")' for n in fallback.local)
        lines += [
            "@font-face {",
            f'  font-family: "{name}";',
            f"  src: {sources};",
            f"  font-weight: {face.weight};",
            "  font-style: normal;",
            f"  size-adjust: {pct(adjust)};",
            f"  ascent-override: {pct(face.ascent / adjust)};",
            f"  descent-override: {pct(face.descent / adjust)};",
            "  line-gap-override: 0%;",
            "}",
        ]
    return "\n".join(lines)


def main() -> None:
    blocks = [
        "/* Generated by scripts/build-fonts.py. Do not edit by hand. */",
    ]
    for face in FACES:
        size, advance = build(face)
        print(f"{face.out:28s} {size / 1024:6.1f} KB   average advance {advance:.4f} em ({face.case})")
        blocks.append(rule(face, advance))
    CSS.parent.mkdir(parents=True, exist_ok=True)
    CSS.write_text("\n\n".join(blocks) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {CSS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
