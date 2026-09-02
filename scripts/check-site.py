#!/usr/bin/env python3
"""Check that every file the site actually references exists.

Walks HTML under public/ for href/src/srcset/poster, meta image URLs,
CSS url(), and webmanifest icon src. Forbids root-absolute internal
paths so file:// and subpath hosts keep working. Does not keep a
hand list of image filenames — those go stale when assets are replaced.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SITE_ORIGIN = "https://rbitcoin.org"

HREF_SRC = re.compile(r"""(?:href|src|poster)\s*=\s*["']([^"']+)["']""", re.I)
SRCSET = re.compile(r"""srcset\s*=\s*["']([^"']+)["']""", re.I)
META_CONTENT = re.compile(
    r"""<meta\b[^>]*\b(?:property|name)\s*=\s*["']([^"']+)["'][^>]*\bcontent\s*=\s*["']([^"']+)["']""",
    re.I,
)
META_CONTENT_SWAP = re.compile(
    r"""<meta\b[^>]*\bcontent\s*=\s*["']([^"']+)["'][^>]*\b(?:property|name)\s*=\s*["']([^"']+)["']""",
    re.I,
)
CSS_URL = re.compile(r"""url\(\s*['"]?([^'")\s]+)['"]?\s*\)""", re.I)
IMAGE_META = {
    "og:image",
    "og:image:url",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
}

SKIP_PREFIX = ("mailto:", "javascript:", "data:", "tel:")


def skip_external(ref: str) -> bool:
    if ref.startswith(SKIP_PREFIX) or ref.startswith("#"):
        return True
    if ref.startswith("//"):
        return True
    if ref.startswith(("http://", "https://")):
        return not (
            ref == SITE_ORIGIN
            or ref.startswith(SITE_ORIGIN + "/")
        )
    return False


def strip_ref(ref: str) -> str:
    return ref.split("#", 1)[0].split("?", 1)[0]


def resolve(base: Path, ref: str) -> Path | None:
    path = strip_ref(ref.strip())
    if not path:
        return None
    if path.startswith(("http://", "https://")):
        rest = path[len(SITE_ORIGIN) :]
        if rest.startswith("/"):
            rest = rest[1:]
        return (PUBLIC / rest).resolve()
    return (base.parent / path).resolve()


def under_public(target: Path) -> bool:
    try:
        target.relative_to(PUBLIC.resolve())
        return True
    except ValueError:
        return False


def main() -> int:
    fail = 0
    seen: set[tuple[str, str, str]] = set()

    def note(kind: str, source: Path, ref: str, target: Path | None, msg: str) -> None:
        nonlocal fail
        key = (str(source), kind, ref)
        if key in seen:
            return
        seen.add(key)
        rel = source.relative_to(ROOT)
        print(f"{msg}: {kind} in {rel}: {ref}" + (f" -> {target}" if target else ""))
        fail = 1

    html_files = sorted(PUBLIC.rglob("*.html"))
    css_files: set[Path] = set()
    manifests: set[Path] = set()

    for html in html_files:
        text = html.read_text(encoding="utf-8")
        refs: list[tuple[str, str]] = []
        for ref in HREF_SRC.findall(text):
            refs.append(("href/src", ref))
        for srcset in SRCSET.findall(text):
            for part in srcset.split(","):
                url = part.strip().split()[0] if part.strip() else ""
                if url:
                    refs.append(("srcset", url))
        metas = list(META_CONTENT.findall(text)) + [
            (name, content) for content, name in META_CONTENT_SWAP.findall(text)
        ]
        for name, content in metas:
            if name.lower() in IMAGE_META:
                refs.append((name, content))

        for kind, ref in refs:
            if skip_external(ref):
                continue
            if ref.startswith("/") and not ref.startswith("//"):
                note(kind, html, ref, None, "absolute")
                continue
            target = resolve(html, ref)
            if target is None:
                continue
            if not under_public(target):
                note(kind, html, ref, target, "outside public/")
                continue
            if not target.exists():
                note(kind, html, ref, target, "missing")
                continue
            if target.suffix.lower() == ".css":
                css_files.add(target)
            if target.name.endswith(".webmanifest") or target.suffix == ".json":
                manifests.add(target)

    for css in sorted(css_files):
        text = css.read_text(encoding="utf-8")
        for ref in CSS_URL.findall(text):
            if skip_external(ref) or ref.startswith("#"):
                continue
            if ref.startswith("/") and not ref.startswith("//"):
                note("css-url", css, ref, None, "absolute")
                continue
            target = resolve(css, ref)
            if target is None:
                continue
            if not under_public(target) or not target.exists():
                note("css-url", css, ref, target, "missing")

    for man in sorted(manifests):
        data = json.loads(man.read_text(encoding="utf-8"))
        icons = data.get("icons") or []
        for icon in icons:
            ref = icon.get("src") or ""
            if not ref or skip_external(ref):
                continue
            if ref.startswith("/") and not ref.startswith("//"):
                note("manifest", man, ref, None, "absolute")
                continue
            target = resolve(man, ref)
            if target is None:
                continue
            if not under_public(target) or not target.exists():
                note("manifest", man, ref, target, "missing")

    if fail:
        return 1
    print(
        f"ok: {len(html_files)} html, {len(css_files)} css, "
        f"{len(manifests)} manifest"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
