# claude-changelog-action

> **AI-powered CHANGELOG.md updates and release notes using Claude.**
> Reads your PR descriptions and commit history → generates a structured changelog entry automatically on every merge or tag.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-claude--changelog--action-blue?logo=github)](https://github.com/marketplace/actions/claude-changelog-action)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why?

[git-cliff](https://github.com/orhun/git-cliff) has **9,200 GitHub stars** — developers clearly want automated changelogs. But conventional commit parsers require perfectly-formatted commit messages. Claude reads *any* commit history + PR descriptions and writes human-quality entries that actually make sense.

- **Zero commit message discipline required** — Claude understands context, not just tags
- **PR body integration** — pulls in feature descriptions you already wrote
- **Three output formats**: Keep a Changelog, Conventional Commits, or Simple
- **Release notes output** — ready to paste into GitHub Releases

---

## Quick start

```yaml
# .github/workflows/changelog.yml
name: Update Changelog

on:
  push:
    tags:
      - 'v*'

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for full git history

      - name: Generate changelog entry
        id: changelog
        uses: icgriggs14/claude-changelog-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          release_tag: ${{ github.ref_name }}

      - name: Commit updated CHANGELOG.md
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add CHANGELOG.md
          git commit -m "docs: update CHANGELOG for ${{ github.ref_name }}" || echo "No changes"
          git push

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.changelog.outputs.release_notes }}
```

---

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic_api_key` | ✅ | — | Your Anthropic API key (add as a GitHub secret) |
| `changelog_file` | No | `CHANGELOG.md` | Path to your changelog file |
| `release_tag` | No | auto-detected | Version string (e.g. `v1.2.0`) |
| `style` | No | `keepachangelog` | Format: `keepachangelog` / `conventional` / `simple` |
| `model` | No | `claude-haiku-4-5-20251001` | Claude model to use |
| `max_commits` | No | `50` | Max commits to include in context |
| `commit_range` | No | auto-detected | Custom git range (e.g. `v1.0.0..HEAD`) |

## Outputs

| Output | Description |
|--------|-------------|
| `changelog_entry` | The full generated changelog section (markdown) |
| `release_notes` | Condensed 2–5 sentence release summary |
| `version` | The version string used |

---

## Use on every PR merge

```yaml
on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  changelog:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: icgriggs14/claude-changelog-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          release_tag: Unreleased
          style: keepachangelog
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add CHANGELOG.md && git commit -m "docs: changelog update" && git push
```

---

## Get an API key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add it to your repo: **Settings → Secrets → Actions → New secret → `ANTHROPIC_API_KEY`**

Claude Haiku (the default model) costs ~$0.0002 per changelog generation — essentially free.

---

## Related tools

Part of the **claude autonomous-rail suite** — AI-powered developer tools that run entirely in GitHub Actions:

- [**claude-pr-review**](https://github.com/icgriggs14/claude-pr-review) — AI code review on every PR
- [**claude-test-writer**](https://github.com/icgriggs14/claude-test-writer) — Auto-generate unit tests for every PR
- **claude-changelog-action** — Auto-generate changelogs & release notes (this repo)

**npm CLI companions** (coming soon to npm):
- `npx claude-pr-review` — run PR review from the command line
- `npx claude-commit` — AI-powered conventional commit messages

---

## Support development

If this saves you time, consider [sponsoring on GitHub Sponsors](https://github.com/sponsors/icgriggs14). Every contribution helps keep the project maintained.

---

## License

MIT © [Ian Griggs](https://github.com/icgriggs14)


## Other Claude AI Tools

These companion tools from the same author work great together:

- **[claude-pr-review](https://github.com/icgriggs14/claude-pr-review)** — AI-powered PR code review using Claude
- **[claude-test-writer](https://github.com/icgriggs14/claude-test-writer)** — AI unit test generation CLI + GitHub Action
- **[react-doctor-action](https://github.com/icgriggs14/react-doctor-action)** — CI health checks for React projects
- **[knip-action](https://github.com/icgriggs14/knip-action)** — CI enforcement for knip unused-exports detection
- **[secretlint-action](https://github.com/icgriggs14/secretlint-action)** — CI credential leak detection using secretlint

[Sponsor this work on GitHub Sponsors](https://github.com/sponsors/icgriggs14)
