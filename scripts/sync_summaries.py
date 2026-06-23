#!/usr/bin/env python3
"""Copy public export summaries from radar-state into the Astro site data directory."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def sync_summaries(state_dir: Path, site_data_dir: Path, dry_run: bool = False) -> int:
    export_dir = state_dir / "export"
    if not export_dir.is_dir():
        print(f"export directory not found: {export_dir}", file=sys.stderr)
        return 1

    site_data_dir.mkdir(parents=True, exist_ok=True)
    copied = 0

    for week_dir in sorted(export_dir.iterdir()):
        if not week_dir.is_dir():
            continue
        src = week_dir / "summary.json"
        if not src.is_file():
            continue
        dest = site_data_dir / f"{week_dir.name}.json"
        if dry_run:
            print(f"would copy {src} -> {dest}")
        else:
            shutil.copy2(src, dest)
            print(f"copied {dest.name}")
        copied += 1

    if copied == 0:
        print("no summaries found in export/")
        return 0

    print(f"synced {copied} summary file(s)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync radar-state export summaries into site data.")
    parser.add_argument(
        "--state-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "state",
        help="Path to radar-state (default: ../state relative to radar repo root)",
    )
    parser.add_argument(
        "--site-data-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "site" / "src" / "data" / "summaries",
        help="Destination for summary JSON files",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print actions without copying")
    args = parser.parse_args()

    return sync_summaries(args.state_dir, args.site_data_dir, dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
