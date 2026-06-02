# Changelog

All notable changes to claude-changelog-action will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-06-02

### Added
- Initial release: AI-powered CHANGELOG.md generation from git commit history + PR descriptions
- Support for Keep a Changelog, Conventional Commits, and Simple format styles
- Auto-detection of git commit range from previous tag to HEAD
- GitHub Release `release_notes` output — ready to paste into a GitHub Release body
- Configurable Claude model (defaults to Haiku for speed and cost efficiency)
- `max_commits` input to control context window size
- `commit_range` input for custom git ranges
- `release_tag` input for explicit version override
