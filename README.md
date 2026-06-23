# Offsend Radar

Orchestrator for weekly `offsend report` scans across a fleet of repositories. Scan artifacts are written to the private [radar-state](https://github.com/Offsend/radar-state) repo.

## Prerequisites

- macOS with [offsend-cli](https://github.com/Offsend/homebrew-tap) installed
- Python 3.10+
- A checkout of `radar-state` (sibling directory or any path)

## Local run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export RADAR_STATE_DIR="../radar-state"
export GITHUB_TOKEN="ghp_..."   # needed for private target repos

python3 scripts/scan_week.py --week 2026-W26
```

Options:

| Flag | Description |
|------|-------------|
| `--week YYYY-Www` | ISO week (default: current UTC week) |
| `--state-dir PATH` | Path to radar-state (or `RADAR_STATE_DIR`) |
| `--offsend-bin PATH` | Path to `offsend` (or `OFFSEND_BIN`) |
| `--dry-run` | Print planned actions only |
| `--aggregate-only` | Rebuild `weekly/` and `export/` without scanning |

## What it does

1. Reads `targets/<week>.yml` from radar-state.
2. Appends skip entries to `state/skipped.jsonl`.
3. For each repo not yet recorded this week: clone → `offsend report` → write `runs/<batch>/<owner>__<repo>/`.
4. Updates `state/scanned.jsonl` or `state/errors.jsonl`.
5. Writes `weekly/<week>.summary.json` and `export/<week>/summary.json`.

Repos already present in `state/*.jsonl` for the given week are not rescanned.

## CI

GitHub Actions workflow `.github/workflows/weekly.yml`:

- Runs every Monday 06:00 UTC (and on manual dispatch).
- Requires secret **`RADAR_STATE_TOKEN`** — PAT with `repo` scope for `Offsend/radar-state` (read/write) and access to target repositories.

## Layout

```
radar/
├── .github/workflows/
│   ├── weekly.yml
│   └── deploy-site.yml
├── scripts/
│   ├── scan_week.py
│   └── sync_summaries.py
├── site/                  # Astro static site → radar.offsend.io
└── requirements.txt
```

Data lives in `radar-state/` — see that repo's README for file formats.

## Site

Public dashboard at [radar.offsend.io](https://radar.offsend.io), built with Astro and deployed to GitHub Pages.

Weekly summaries are copied from `radar-state/export/<week>/summary.json` into `site/src/data/summaries/`:

```bash
python3 scripts/sync_summaries.py --state-dir ../radar-state
cd site && npm install && npm run dev
```

CI (`deploy-site.yml`) rebuilds the site after each weekly scan or on push to `site/`.
