// Smoke test — validates source structure without calling the API
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function check(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${desc}: ${e.message}`);
    failed++;
  }
}

console.log('claude-changelog-action smoke tests\n');

check('action.yml exists', () => {
  if (!fs.existsSync(path.join(root, 'action.yml'))) throw new Error('missing');
});

check('action.yml has required inputs', () => {
  const content = fs.readFileSync(path.join(root, 'action.yml'), 'utf8');
  if (!content.includes('anthropic_api_key')) throw new Error('missing anthropic_api_key input');
  if (!content.includes('changelog_file')) throw new Error('missing changelog_file input');
  if (!content.includes('style')) throw new Error('missing style input');
});

check('action.yml uses node20 runtime', () => {
  const content = fs.readFileSync(path.join(root, 'action.yml'), 'utf8');
  if (!content.includes("using: 'node20'")) throw new Error('not node20');
});

check('src/index.js exists', () => {
  if (!fs.existsSync(path.join(root, 'src/index.js'))) throw new Error('missing');
});

check('src/index.js requires @actions/core', () => {
  const content = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
  if (!content.includes("require('@actions/core')")) throw new Error('missing @actions/core require');
});

check('src/index.js requires @anthropic-ai/sdk', () => {
  const content = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
  if (!content.includes("require('@anthropic-ai/sdk')")) throw new Error('missing @anthropic-ai/sdk require');
});

check('src/index.js has buildPrompt function', () => {
  const content = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
  if (!content.includes('buildPrompt')) throw new Error('missing buildPrompt');
});

check('package.json has correct name', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.name !== 'claude-changelog-action') throw new Error(`wrong name: ${pkg.name}`);
});

check('package.json has @anthropic-ai/sdk dependency', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!pkg.dependencies['@anthropic-ai/sdk']) throw new Error('missing @anthropic-ai/sdk');
});

check('README.md exists and has quick start section', () => {
  const content = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  if (!content.includes('Quick start')) throw new Error('missing Quick start section');
  if (!content.includes('anthropic_api_key')) throw new Error('missing API key instructions');
});

check('CHANGELOG.md exists', () => {
  if (!fs.existsSync(path.join(root, 'CHANGELOG.md'))) throw new Error('missing');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
