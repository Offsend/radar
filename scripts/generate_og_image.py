#!/usr/bin/env python3
"""Generate social preview PNGs for weekly Offsend Radar reports."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

WEEK_RE = re.compile(r"^(\d{4})-W(\d{2})$")
TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "og-report.svg"
OG_WIDTH = 1200
OG_HEIGHT = 630


def og_image_filename(week: str) -> str:
    match = WEEK_RE.match(week)
    if not match:
        raise ValueError(f"Invalid ISO week: {week!r}")
    return f"{match.group(1)}_{int(match.group(2))}.png"


def og_image_path(output_dir: Path, week: str) -> Path:
    return output_dir / og_image_filename(week)


UNAVAILABLE_METRIC = "—"


def format_pct(value: float) -> str:
    return f"{round(value * 100)}%"


def format_optional_pct(value: float | None) -> str:
    if value is None:
        return UNAVAILABLE_METRIC
    return format_pct(value)


def get_repos_with_risk_signals_pct(summary: dict[str, Any]) -> float | None:
    cohort = summary.get("cohort") or {}
    totals = summary.get("totals") or {}
    scan_complete = int(cohort.get("scanComplete") or 0)
    if scan_complete == 0:
        return None
    return float(totals.get("reposWithExposures") or 0) / scan_complete


def get_ai_exclude_coverage(summary: dict[str, Any]) -> float | None:
    stored = (summary.get("ignoreCoverage") or {}).get("aiExcludePct")
    if stored is not None:
        return float(stored)
    return None


def format_iso_week_range(week_id: str) -> str | None:
    match = WEEK_RE.match(week_id)
    if not match:
        return None

    year = int(match.group(1))
    week = int(match.group(2))

    jan4 = datetime(year, 1, 4, tzinfo=timezone.utc)
    week1_monday = jan4 - timedelta(days=jan4.isoweekday() - 1)
    monday = week1_monday + timedelta(weeks=week - 1)
    sunday = monday + timedelta(days=6)

    def month_day(date: datetime) -> str:
        return f"{date.strftime('%b')} {date.day}"

    if monday.month == sunday.month:
        return f"{month_day(monday)}–{sunday.day}, {monday.year}"
    return f"{month_day(monday)} – {month_day(sunday)}, {sunday.year}"


def report_number(weeks: list[str], week: str) -> int | None:
    if week not in weeks:
        return None
    return weeks.index(week) + 1


def list_export_weeks(export_dir: Path) -> list[str]:
    weeks: list[str] = []
    if not export_dir.is_dir():
        return weeks
    for week_dir in export_dir.iterdir():
        if week_dir.is_dir() and (week_dir / "summary.json").is_file():
            weeks.append(week_dir.name)
    return sorted(weeks)


def build_template_values(
    summary: dict[str, Any],
    *,
    report_label: str,
    date_range: str | None,
) -> dict[str, str]:
    cohort = summary.get("cohort") or {}
    totals = summary.get("totals") or {}

    return {
        "REPORT_LABEL": escape(report_label),
        "DATE_RANGE": escape(date_range or ""),
        "SCANNED": escape(str(cohort.get("scanComplete", 0))),
        "SIGNALS": escape(str(totals.get("totalExposedFiles", 0))),
        "REPOS_AFFECTED": escape(format_optional_pct(get_repos_with_risk_signals_pct(summary))),
        "AI_IGNORE": escape(format_optional_pct(get_ai_exclude_coverage(summary))),
    }


def render_template(template_path: Path, values: dict[str, str]) -> str:
    template = template_path.read_text(encoding="utf-8")
    for key, value in values.items():
        template = template.replace(f"{{{key}}}", value)
    return template


def svg_to_png(svg_content: str, destination: Path) -> None:
    rsvg = shutil.which("rsvg-convert")
    if rsvg:
        with tempfile.NamedTemporaryFile("w", suffix=".svg", encoding="utf-8", delete=False) as handle:
            handle.write(svg_content)
            temp_svg = Path(handle.name)
        try:
            subprocess.run(
                [
                    rsvg,
                    "-w",
                    str(OG_WIDTH),
                    "-h",
                    str(OG_HEIGHT),
                    str(temp_svg),
                    "-o",
                    str(destination),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            return
        finally:
            temp_svg.unlink(missing_ok=True)

    try:
        import cairosvg
    except ImportError as exc:
        raise RuntimeError(
            "SVG to PNG conversion requires rsvg-convert (librsvg) or cairosvg. "
            "Install librsvg (brew install librsvg / apt install librsvg2-bin) "
            "or pip install cairosvg with Cairo system libraries."
        ) from exc

    cairosvg.svg2png(
        bytestring=svg_content.encode("utf-8"),
        write_to=str(destination),
        output_width=OG_WIDTH,
        output_height=OG_HEIGHT,
    )


def generate_og_image(
    summary: dict[str, Any],
    output_dir: Path,
    *,
    weeks: list[str] | None = None,
    template_path: Path = TEMPLATE_PATH,
    dry_run: bool = False,
) -> Path:
    week = summary["week"]
    output_dir.mkdir(parents=True, exist_ok=True)
    destination = og_image_path(output_dir, week)

    ordered_weeks = weeks or [week]
    number = report_number(ordered_weeks, week)
    report_label = f"Offsend Radar #{number}" if number is not None else week
    date_range = format_iso_week_range(week)

    if dry_run:
        print(f"would write OG image -> {destination}")
        return destination

    values = build_template_values(
        summary,
        report_label=report_label,
        date_range=date_range,
    )
    svg_content = render_template(template_path, values)
    svg_to_png(svg_content, destination)
    print(f"wrote OG image -> {destination}")
    return destination


def generate_from_export(
    export_dir: Path,
    output_dir: Path,
    *,
    week: str | None = None,
    dry_run: bool = False,
) -> int:
    weeks = list_export_weeks(export_dir)
    if not weeks:
        print("no export summaries found", file=sys.stderr)
        return 1

    targets = [week] if week else weeks
    generated = 0

    for target_week in targets:
        summary_path = export_dir / target_week / "summary.json"
        if not summary_path.is_file():
            print(f"summary not found: {summary_path}", file=sys.stderr)
            return 1
        summary = json.loads(summary_path.read_text(encoding="utf-8"))
        generate_og_image(summary, output_dir, weeks=weeks, dry_run=dry_run)
        generated += 1

    print(f"generated {generated} OG image(s)")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate OG preview PNGs for weekly reports.")
    parser.add_argument(
        "--export-dir",
        type=Path,
        help="Path to radar-state export directory",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "site" / "public" / "og",
        help="Destination directory for PNG files",
    )
    parser.add_argument("--week", help="Generate only this ISO week (YYYY-Www)")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing files")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.export_dir:
        print("error: --export-dir is required", file=sys.stderr)
        return 2

    return generate_from_export(
        args.export_dir.expanduser().resolve(),
        args.output_dir.expanduser().resolve(),
        week=args.week,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
