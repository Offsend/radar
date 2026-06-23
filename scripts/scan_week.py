#!/usr/bin/env python3
"""Weekly Offsend Radar scan orchestrator."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

SCHEMA_VERSION = 1
SLUG_RE = re.compile(r"^[^/]+/[^/]+$")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def batch_id_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")


def current_iso_week() -> str:
    return datetime.now(timezone.utc).strftime("%G-W%V")


def repo_dir_name(slug: str) -> str:
    owner, name = slug.split("/", 1)
    return f"{owner}__{name}"


def parse_slug(slug: str) -> tuple[str, str]:
    if not SLUG_RE.match(slug):
        raise ValueError(f"Invalid repo slug: {slug!r} (expected owner/name)")
    owner, name = slug.split("/", 1)
    return owner, name


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists() or path.stat().st_size == 0:
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row, separators=(",", ":"), ensure_ascii=False) + "\n")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_targets(state_dir: Path, week: str) -> dict[str, Any]:
    path = state_dir / "targets" / f"{week}.yml"
    if not path.exists():
        raise FileNotFoundError(f"Targets file not found: {path}")
    with path.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if data.get("week") and data["week"] != week:
        raise ValueError(f"Targets week mismatch: file says {data['week']}, expected {week}")
    data.setdefault("repos", [])
    data.setdefault("skip", [])
    return data


def repos_for_week(state_dir: Path, week: str) -> set[str]:
    scanned = {row["repo"] for row in load_jsonl(state_dir / "state" / "scanned.jsonl") if row.get("week") == week}
    skipped = {row["repo"] for row in load_jsonl(state_dir / "state" / "skipped.jsonl") if row.get("week") == week}
    errored = {row["repo"] for row in load_jsonl(state_dir / "state" / "errors.jsonl") if row.get("week") == week}
    return scanned | skipped | errored


def clone_repo(slug: str, ref: str, token: str | None) -> Path:
    temp_root = Path(tempfile.mkdtemp(prefix="radar-clone-"))
    destination = temp_root / "repo"
    if token:
        url = f"https://x-access-token:{token}@github.com/{slug}.git"
    else:
        url = f"https://github.com/{slug}.git"
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    subprocess.run(
        ["git", "clone", "--depth", "1", "--branch", ref, url, str(destination)],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )
    return destination


def run_offsend_report(offsend_bin: str, repo_dir: Path, out_path: Path) -> tuple[dict[str, Any], int]:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [offsend_bin, "report", str(repo_dir), "--out", str(out_path)],
        capture_output=True,
        text=True,
    )
    if not out_path.exists():
        stderr = result.stderr.strip() or result.stdout.strip() or "offsend report produced no output file"
        raise RuntimeError(stderr)
    report = json.loads(out_path.read_text(encoding="utf-8"))
    return report, result.returncode


def record_skips(state_dir: Path, week: str, skips: list[dict[str, Any]], seen: set[str]) -> None:
    skipped_path = state_dir / "state" / "skipped.jsonl"
    for item in skips:
        slug = item["repo"]
        if slug in seen:
            continue
        append_jsonl(
            skipped_path,
            {
                "ts": utc_now_iso(),
                "week": week,
                "repo": slug,
                "status": "skipped",
                "reason": item.get("reason", "listed in targets"),
            },
        )
        seen.add(slug)


def scan_repo(
    *,
    state_dir: Path,
    week: str,
    batch_id: str,
    slug: str,
    ref: str,
    offsend_bin: str,
    token: str | None,
    dry_run: bool,
) -> None:
    owner, name = parse_slug(slug)
    run_rel = Path("runs") / batch_id / repo_dir_name(slug)
    run_dir = state_dir / run_rel
    report_path = run_dir / "report.json"
    meta_path = run_dir / "meta.json"

    if dry_run:
        print(f"[dry-run] would scan {slug}@{ref} -> {run_rel}")
        return

    clone_dir: Path | None = None
    try:
        clone_dir = clone_repo(slug, ref, token)
        report, exit_code = run_offsend_report(offsend_bin, clone_dir, report_path)
        write_json(
            meta_path,
            {
                "batchId": batch_id,
                "generatedAt": utc_now_iso(),
                "owner": owner,
                "ref": ref,
                "repo": name,
                "slug": slug,
                "week": week,
            },
        )

        scan_complete = bool(report.get("scanComplete"))
        has_errors = bool(report.get("errors"))
        ledger_path = state_dir / "state" / ("errors.jsonl" if has_errors or not scan_complete or exit_code != 0 else "scanned.jsonl")
        row = {
            "ts": utc_now_iso(),
            "week": week,
            "repo": slug,
            "status": "error" if ledger_path.name == "errors.jsonl" else "scanned",
            "runPath": str(run_rel).replace("\\", "/"),
            "toolVersion": report.get("toolVersion"),
            "rulesetVersion": report.get("rulesetVersion"),
            "scanComplete": scan_complete,
        }
        if ledger_path.name == "errors.jsonl":
            row["reason"] = "offsend report errors or incomplete scan"
            if exit_code != 0:
                row["exitCode"] = exit_code
        append_jsonl(ledger_path, row)
        print(f"{'error' if ledger_path.name == 'errors.jsonl' else 'scanned'}: {slug} -> {run_rel}")
    except subprocess.CalledProcessError as exc:
        append_jsonl(
            state_dir / "state" / "errors.jsonl",
            {
                "ts": utc_now_iso(),
                "week": week,
                "repo": slug,
                "status": "error",
                "reason": (exc.stderr or exc.stdout or str(exc)).strip(),
            },
        )
        print(f"error: {slug} ({exc})", file=sys.stderr)
    finally:
        if clone_dir is not None:
            shutil.rmtree(clone_dir.parent, ignore_errors=True)


def aggregate_week(state_dir: Path, week: str, dry_run: bool) -> dict[str, Any]:
    targets = load_targets(state_dir, week)
    scanned_rows = [row for row in load_jsonl(state_dir / "state" / "scanned.jsonl") if row.get("week") == week]
    skipped_rows = [row for row in load_jsonl(state_dir / "state" / "skipped.jsonl") if row.get("week") == week]
    error_rows = [row for row in load_jsonl(state_dir / "state" / "errors.jsonl") if row.get("week") == week]

    complete_rows = [row for row in scanned_rows if row.get("scanComplete") is True]
    reports: list[dict[str, Any]] = []
    for row in complete_rows:
        report_path = state_dir / row["runPath"] / "report.json"
        if report_path.exists():
            reports.append(json.loads(report_path.read_text(encoding="utf-8")))

    pattern_stats: dict[tuple[str, str, str], dict[str, int]] = defaultdict(lambda: {"reposAffected": 0, "totalCount": 0})
    ignore_stats: dict[str, dict[str, int]] = defaultdict(lambda: {"present": 0, "total": 0})
    ruleset_versions: set[str] = set()
    tool_versions: list[str] = []
    repos_with_exposures = 0
    total_exposed_files = 0

    for report in reports:
        tool_version = report.get("toolVersion")
        if isinstance(tool_version, str):
            tool_versions.append(tool_version)
        ruleset = report.get("rulesetVersion")
        if isinstance(ruleset, str):
            ruleset_versions.add(ruleset)

        exposed = report.get("exposedPatterns") or []
        totals = report.get("totals") or {}
        exposed_files = int(totals.get("exposedFiles") or 0)
        total_exposed_files += exposed_files
        if exposed_files > 0:
            repos_with_exposures += 1

        seen_patterns: set[tuple[str, str, str]] = set()
        for item in exposed:
            key = (item["id"], item["category"], item["severity"])
            pattern_stats[key]["totalCount"] += int(item.get("count") or 0)
            if key not in seen_patterns:
                pattern_stats[key]["reposAffected"] += 1
                seen_patterns.add(key)

        for rule_id, present in (report.get("ignoreFilesPresent") or {}).items():
            ignore_stats[rule_id]["total"] += 1
            if present:
                ignore_stats[rule_id]["present"] += 1

    exposed_patterns = [
        {
            "id": key[0],
            "category": key[1],
            "severity": key[2],
            "reposAffected": value["reposAffected"],
            "totalCount": value["totalCount"],
        }
        for key, value in sorted(
            pattern_stats.items(),
            key=lambda item: (item[0][2], item[0][0]),
        )
    ]

    ignore_files_present = {
        rule_id: {
            "present": stats["present"],
            "total": stats["total"],
            "pct": round(stats["present"] / stats["total"], 4) if stats["total"] else 0.0,
        }
        for rule_id, stats in sorted(ignore_stats.items())
    }

    summary = {
        "schemaVersion": SCHEMA_VERSION,
        "week": week,
        "generatedAt": utc_now_iso(),
        "toolVersionRange": [min(tool_versions), max(tool_versions)] if tool_versions else [],
        "rulesetVersions": sorted(ruleset_versions),
        "cohort": {
            "targeted": len(targets["repos"]) + len(targets["skip"]),
            "scanned": len(scanned_rows),
            "skipped": len(skipped_rows),
            "errors": len(error_rows),
            "scanComplete": len(complete_rows),
        },
        "ignoreFilesPresent": ignore_files_present,
        "exposedPatterns": exposed_patterns,
        "totals": {
            "reposWithExposures": repos_with_exposures,
            "totalExposedFiles": total_exposed_files,
        },
    }

    if dry_run:
        print(f"[dry-run] would write weekly summary for {week}")
        return summary

    weekly_path = state_dir / "weekly" / f"{week}.summary.json"
    export_path = state_dir / "export" / week / "summary.json"
    write_json(weekly_path, summary)
    write_json(export_path, summary)
    print(f"aggregated: {weekly_path}")
    return summary


def resolve_offsend_bin(explicit: str | None) -> str:
    if explicit:
        return explicit
    found = shutil.which("offsend")
    if not found:
        raise RuntimeError("offsend not found on PATH; install offsend-cli or set OFFSEND_BIN")
    return found


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run weekly Offsend Radar scans into radar-state.")
    parser.add_argument("--week", help="ISO week (YYYY-Www). Defaults to current UTC week.")
    parser.add_argument(
        "--state-dir",
        default=os.environ.get("RADAR_STATE_DIR"),
        help="Path to radar-state checkout (default: RADAR_STATE_DIR env)",
    )
    parser.add_argument("--offsend-bin", default=os.environ.get("OFFSEND_BIN"), help="Path to offsend binary")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without cloning or writing files")
    parser.add_argument("--aggregate-only", action="store_true", help="Skip scans and rebuild weekly summary")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    week = args.week or current_iso_week()
    if not args.state_dir:
        print("error: --state-dir or RADAR_STATE_DIR is required", file=sys.stderr)
        return 2

    state_dir = Path(args.state_dir).expanduser().resolve()
    if not state_dir.is_dir():
        print(f"error: state dir not found: {state_dir}", file=sys.stderr)
        return 2

    if not args.aggregate_only:
        offsend_bin = resolve_offsend_bin(args.offsend_bin)
        targets = load_targets(state_dir, week)
        seen = repos_for_week(state_dir, week)
        record_skips(state_dir, week, targets["skip"], seen)
        seen = repos_for_week(state_dir, week)

        batch_id = batch_id_now()
        token = os.environ.get("GITHUB_TOKEN")
        for repo_spec in targets["repos"]:
            slug = repo_spec["repo"]
            ref = repo_spec.get("ref", "main")
            if slug in seen:
                print(f"skip existing: {slug}")
                continue
            scan_repo(
                state_dir=state_dir,
                week=week,
                batch_id=batch_id,
                slug=slug,
                ref=ref,
                offsend_bin=offsend_bin,
                token=token,
                dry_run=args.dry_run,
            )

    aggregate_week(state_dir, week, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
