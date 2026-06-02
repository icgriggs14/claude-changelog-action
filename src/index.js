const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

async function getGitLog(commitRange, maxCommits) {
  let output = '';
  const args = ['log', '--pretty=format:%H|%s|%an|%ae|%ai', `--max-count=${maxCommits}`];
  if (commitRange) args.push(commitRange);
  await exec.exec('git', args, {
    listeners: { stdout: (data) => { output += data.toString(); } },
    silent: true,
  });
  return output.trim();
}

async function getPRBodies(octokit, context, commitRange) {
  if (!octokit || !context.payload.repository) return '';
  try {
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const pulls = await octokit.rest.pulls.list({
      owner, repo,
      state: 'closed',
      per_page: 20,
      sort: 'updated',
      direction: 'desc',
    });
    const recentPRs = pulls.data
      .filter(pr => pr.merged_at)
      .slice(0, 10)
      .map(pr => `PR #${pr.number}: ${pr.title}\n${pr.body || '(no description)'}`)
      .join('\n\n---\n\n');
    return recentPRs;
  } catch (e) {
    core.warning(`Could not fetch PR bodies: ${e.message}`);
    return '';
  }
}

function buildPrompt(gitLog, prBodies, version, style) {
  const styleGuide = {
    keepachangelog: `Use Keep a Changelog format (https://keepachangelog.com):
## [${version}] - YYYY-MM-DD
### Added
- ...
### Changed
- ...
### Fixed
- ...
### Deprecated / Removed / Security (only if applicable)`,
    conventional: `Use Conventional Commits changelog format:
## ${version} (YYYY-MM-DD)
### Features
* ...
### Bug Fixes
* ...
### Breaking Changes (if any)
* ...`,
    simple: `Use a simple bullet-point format:
## ${version} — YYYY-MM-DD
What's new:
- ...
Bug fixes:
- ...`,
  };

  const format = styleGuide[style] || styleGuide.keepachangelog;

  return `You are a technical writer generating a professional CHANGELOG entry.

Below are the recent git commits and merged PR descriptions for version ${version}.

COMMIT LOG:
${gitLog || '(no commits found in range)'}

${prBodies ? `RECENT PULL REQUESTS:\n${prBodies}` : ''}

Generate a CHANGELOG.md section following this format:
${format}

Rules:
1. Group changes into logical categories. Omit empty sections.
2. Write developer-friendly descriptions, not raw commit messages. Summarize related commits into one entry.
3. Highlight breaking changes prominently if any exist.
4. Keep each bullet point concise (one line, max 100 chars).
5. Use today's date (ISO format YYYY-MM-DD) for the release date.
6. Also produce a short "release_notes" section (2-5 sentences, plain English summary suitable for a GitHub Release body).

Output format (JSON):
{
  "changelog_entry": "<the full changelog section as a markdown string>",
  "release_notes": "<2-5 sentence release summary>"
}`;
}

async function run() {
  const apiKey = core.getInput('anthropic_api_key', { required: true });
  const changelogFile = core.getInput('changelog_file') || 'CHANGELOG.md';
  const style = core.getInput('style') || 'keepachangelog';
  const model = core.getInput('model') || 'claude-haiku-4-5-20251001';
  const maxCommits = parseInt(core.getInput('max_commits') || '50', 10);
  let commitRange = core.getInput('commit_range') || '';

  // Determine version from tag, input, or fallback
  let version = core.getInput('release_tag') || '';
  if (!version && github.context.ref && github.context.ref.startsWith('refs/tags/')) {
    version = github.context.ref.replace('refs/tags/', '');
  }
  if (!version) {
    version = 'Unreleased';
  }

  // Auto-detect commit range: from previous tag to HEAD
  if (!commitRange) {
    try {
      let prevTag = '';
      await exec.exec('git', ['describe', '--tags', '--abbrev=0', 'HEAD^'], {
        listeners: { stdout: (d) => { prevTag += d.toString().trim(); } },
        silent: true,
        ignoreReturnCode: true,
      });
      if (prevTag) {
        commitRange = `${prevTag}..HEAD`;
        core.info(`Auto-detected commit range: ${commitRange}`);
      }
    } catch {
      core.info('Could not auto-detect commit range; using all recent commits');
    }
  }

  core.info(`Building changelog entry for version: ${version}`);

  const gitLog = await getGitLog(commitRange, maxCommits);
  if (!gitLog) {
    core.warning('No commits found in range. Changelog entry may be empty.');
  }

  const octokit = process.env.GITHUB_TOKEN
    ? github.getOctokit(process.env.GITHUB_TOKEN)
    : null;
  const prBodies = await getPRBodies(octokit, github.context, commitRange);

  const prompt = buildPrompt(gitLog, prBodies, version, style);

  const client = new Anthropic({ apiKey });
  core.info(`Calling ${model} for changelog generation...`);

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse JSON response
  let changelogEntry = '';
  let releaseNotes = '';
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      changelogEntry = parsed.changelog_entry || '';
      releaseNotes = parsed.release_notes || '';
    }
  } catch {
    // Fallback: treat full response as changelog entry
    changelogEntry = rawText;
    releaseNotes = rawText.split('\n').slice(0, 3).join(' ');
  }

  if (!changelogEntry) {
    core.setFailed('Claude returned an empty changelog entry');
    return;
  }

  // Prepend entry to CHANGELOG.md
  const changelogPath = path.resolve(process.cwd(), changelogFile);
  let existingContent = '';
  if (fs.existsSync(changelogPath)) {
    existingContent = fs.readFileSync(changelogPath, 'utf8');
  }

  // Insert after the first heading (# Changelog) or at top
  const headerMatch = existingContent.match(/^(#[^\n]*\n)/);
  let newContent;
  if (headerMatch) {
    newContent = headerMatch[1] + '\n' + changelogEntry + '\n\n' + existingContent.slice(headerMatch[1].length);
  } else {
    newContent = '# Changelog\n\n' + changelogEntry + '\n\n' + existingContent;
  }

  fs.writeFileSync(changelogPath, newContent, 'utf8');
  core.info(`Updated ${changelogFile}`);

  core.setOutput('changelog_entry', changelogEntry);
  core.setOutput('release_notes', releaseNotes);
  core.setOutput('version', version);

  core.info('claude-changelog-action complete');
  core.info(`Version: ${version}`);
  core.info(`Release notes: ${releaseNotes}`);
}

run().catch(err => {
  core.setFailed(`Action failed: ${err.message}`);
});
