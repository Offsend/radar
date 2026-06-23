# Offsend Radar

Public research on **AI-context hygiene** in open-source repositories — part of [Offsend](https://offsend.io/), the local-first CLI and desktop tools that help developers catch secrets and control what AI coding tools can read.

Offsend Radar helps the community understand what AI tools may accidentally see in a project **without exposing, shaming, or publicly auditing individual repositories**. Public results live at [radar.offsend.io](https://radar.offsend.io).

This repo is the **orchestrator**: it runs weekly `offsend report` scans across a fleet of repositories and writes artifacts to the private [radar-state](https://github.com/Offsend/radar-state) data store. The Astro site in `site/` publishes sanitized fleet aggregates.

## Principles

Offsend Radar follows these principles in design, implementation, and publication:

1. **Path-level by default** — Radar focuses on file paths, folder names, ignore files, and project structure. By default, it does not read file contents.

2. **No secrets collection** — Radar is not designed to collect secrets, tokens, credentials, source code snippets, environment values, or private data. Reports must not contain sensitive values.

3. **No public shaming** — Repository names are not published with findings unless the maintainer explicitly opts in. Public reports focus on aggregate patterns, not individual blame.

4. **Aggregate first** — The main output is ecosystem-level insight: common missing ignore rules, risky file categories, AI ignore coverage, and recurring patterns across repositories.

5. **Opt-in for named listings** — A repository may appear by name only if its maintainer chooses to participate. Named listings should be framed positively, for example: “AI Context Reviewed” or “Added AI ignore files.”

6. **Public-safe reports only** — Anything published must be sanitized. Public data includes counts, categories, scan mode, language/framework metadata, and ignore-file coverage — not exact file paths or file contents.

7. **Transparent methodology** — Radar explains how repositories are selected, what is scanned, what is not scanned, and how results are sanitized before publication (see below).

8. **No security claims** — Radar does not certify that a repository is secure, secret-free, or safe. It only reports AI-context hygiene signals based on limited checks.

9. **Local-first alignment** — Radar follows the same philosophy as Offsend: minimize data exposure, avoid unnecessary uploads, and keep sensitive details out of public systems.

10. **Maintainer respect** — If Radar results lead to a PR or outreach, the tone should be helpful and non-alarmist. The message should offer a small improvement, not accuse the project of being insecure.

11. **Reproducible checks** — Where possible, findings should be reproducible with public Offsend CLI commands, such as path-level scans and public-safe report generation.

12. **Useful outcomes** — Every report should help developers do something practical: add AI ignore files, improve project hygiene, run their own local check, or understand common AI-context risks.

## Methodology

### What we scan

Each week, the orchestrator clones target repositories and runs [`offsend report`](https://offsend.io/) — the same public-safe report mode used by the Offsend CLI. Checks include:

- **Exposed patterns** — sensitive file categories (e.g. env files, key material) visible at the path level
- **Ignore file coverage** — presence of AI-oriented ignore files (`.cursorignore`, `.claudeignore`, project rules, etc.)

Scans use shallow clones of a single ref (branch or tag) per repository. Only repositories listed in the weekly cohort are scanned.

### What we do not scan or publish

- File contents, secret values, tokens, or credentials
- Exact file paths or filenames in public exports
- Repository names alongside findings (unless maintainer opt-in)
- Claims of security, compliance, or “secret-free” status

Private orchestration metadata (repo identity, refs, batch IDs) stays in `radar-state` and is never copied to `export/` or the public site — except for repositories whose maintainers have explicitly opted in (see below).

### Named public listings (maintainer opt-in)

Repository names are published **only** when the maintainer has consented. Opt-in is recorded in `radar-state/registry/public-listings.yml`:

```yaml
listings:
  - repo: owner/name
    label: AI Context Reviewed
    consentedAt: "2026-06-23"
    consentRef: https://github.com/owner/name/issues/1   # optional, stays private
```

A repo appears on [radar.offsend.io](https://radar.offsend.io) only if:

1. It is listed in `registry/public-listings.yml`
2. It was scanned with `scanComplete: true` that week
3. Export includes public-safe fields from `report.json` only (pattern IDs and counts — no paths, no secret values)

Listings use positive framing (e.g. “AI Context Reviewed”), not blame-oriented labels. Fleet aggregates remain anonymous; named entries are a separate `publicListings` section in `export/<week>/summary.json`.

### How repositories are selected

Cohorts are defined manually in `radar-state/targets/<week>.yml` — typically open-source repositories the Offsend team tracks or that maintainers opt into. Repos can be explicitly skipped (archived, deprecated, etc.). See [radar-state](https://github.com/Offsend/radar-state) for the targets format.

### How results are sanitized

1. `offsend report` produces anonymized per-repo JSON (pattern IDs and counts, no paths).
2. Fleet aggregates (`weekly/<week>.summary.json`) roll up counts across repos — still private in `radar-state`.
3. `export/<week>/summary.json` is the public-safe subset — fleet aggregates plus opted-in `publicListings`.
4. [radar.offsend.io](https://radar.offsend.io) renders `export/` data via the Astro site in `site/`.

### Reproducing checks locally

Install the Offsend CLI and run the same commands on your own machine:

```bash
brew install --cask offsend/tap/offsend-cli
offsend show          # see what AI tools would read
offsend report . --out report.json   # public-safe report for a repo
```

Nothing is uploaded; scans stay on your Mac, consistent with [Offsend’s local-first approach](https://offsend.io/).

## What this repo does

1. Reads `targets/<week>.yml` from radar-state.
2. Appends skip entries to `state/skipped.jsonl`.
3. For each repo not yet recorded this week: clone → `offsend report` → write `runs/<batch>/<owner>__<repo>/`.
4. Updates `state/scanned.jsonl` or `state/errors.jsonl`.
5. Writes `weekly/<week>.summary.json` and `export/<week>/summary.json`.
6. Syncs `export/` into `site/src/data/summaries/` for the public dashboard.

Repos already present in `state/*.jsonl` for the given week are not rescanned.

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

## CI

GitHub Actions workflow `.github/workflows/weekly.yml`:

- Runs every Monday 06:00 UTC (and on manual dispatch).
- Requires secret **`RADAR_STATE_TOKEN`** — PAT with `repo` scope for `Offsend/radar-state` (read/write), push access to this repo, and access to target repositories.

`deploy-site.yml` rebuilds [radar.offsend.io](https://radar.offsend.io) after each weekly scan or on push to `site/`.

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
