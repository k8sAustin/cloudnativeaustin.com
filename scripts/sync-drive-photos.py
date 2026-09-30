#!/usr/bin/env python3
"""Refresh assets/data/photos.json from the public Google Drive album.

The site is static, so the browser cannot list Drive itself. This script reads
the public folder (and any subfolders, such as a year or event) and writes a
photo list the slideshow loads. A scheduled GitHub Action runs it daily.
"""

import html
import json
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

FOLDER_ID = "1STwCxIGnr3bK4C-loC-7z-_Oum3KE7c-"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "data" / "photos.json"
IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
}
FOLDER_TYPE = "application/vnd.google-apps.folder"
ENTRY_RE = re.compile(
    r'<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?'
    r'drive-thirdparty\.googleusercontent\.com/16/type/([^"]+)"[\s\S]*?'
    r'<div class="flip-entry-title">([^<]*)</div>',
    re.IGNORECASE,
)
CAMERA_NAME = re.compile(
    r"(?i)^(img|dsc|dscn|pxl|screenshot|photo|image)\s*\d*(\s*\(\d+\))?$"
)


def fetch(folder_id):
    url = "https://drive.google.com/embeddedfolderview?id=" + folder_id
    request = urllib.request.Request(url, headers={"User-Agent": "CloudNativeAustinPhotoSync"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read().decode("utf-8", "replace")
    except Exception:
        # Some local Python installs lack CA certificates. curl uses the system store.
        result = subprocess.run(
            ["curl", "-fsSL", "--max-time", "30", "-A", "CloudNativeAustinPhotoSync", url],
            check=True,
            capture_output=True,
        )
        return result.stdout.decode("utf-8", "replace")


def album_label(names):
    visible = [name for name in names if name.lower().replace(" ", "") != "websitephotos"]
    if not visible:
        return "Meetup photos"
    return " / ".join(visible)


def display_title(filename, album):
    stem = re.sub(r"\.[^.]+$", "", filename).replace("_", " ").strip()
    if not stem or CAMERA_NAME.fullmatch(stem):
        return "Meetup photo" if album == "Meetup photos" else album
    return stem


def year_of(*parts):
    match = re.search(r"20\d{2}", " ".join(parts))
    return match.group(0) if match else ""


def list_folder(folder_id, names, seen):
    if folder_id in seen:
        return [], []
    seen.add(folder_id)
    page = fetch(folder_id)
    photos = []
    folders = []
    album = album_label(names)
    for file_id, mime, title in ENTRY_RE.findall(page):
        mime = html.unescape(mime)
        title = html.unescape(title).strip()
        if mime == FOLDER_TYPE:
            folders.append((file_id, title or "Untitled folder"))
            continue
        if mime not in IMAGE_TYPES:
            continue
        photos.append(
            {
                "id": file_id,
                "name": title or "Photo",
                "album": album,
                "year": year_of(album, title),
                "title": display_title(title or "Photo", album),
                "src": "https://lh3.googleusercontent.com/d/" + file_id + "=w1600",
                "thumb": "https://lh3.googleusercontent.com/d/" + file_id + "=w480",
            }
        )
    return photos, folders


def collect(folder_id, names, seen):
    photos, folders = list_folder(folder_id, names, seen)

    def folder_sort_key(item):
        title = item[1]
        year = year_of(title)
        return (year or "0000", title.lower())

    for child_id, child_name in sorted(folders, key=folder_sort_key, reverse=True):
        photos.extend(collect(child_id, names + [child_name], seen))
    return photos


def main():
    photos = collect(FOLDER_ID, ["WebsitePhotos"], set())
    if not photos:
        print("No public photos found. Existing list was left unchanged.", file=sys.stderr)
        return 1
    payload = {
        "folderId": FOLDER_ID,
        "source": "https://drive.google.com/drive/folders/" + FOLDER_ID,
        "syncedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "photos": photos,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("Wrote %d photo(s) to %s" % (len(photos), OUTPUT.relative_to(ROOT)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
