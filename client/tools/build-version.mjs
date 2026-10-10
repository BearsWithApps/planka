// Build stamp for the version label: the build time (ISO, UTC) and the short git hash.
// The hash prefers `git rev-parse --short=7 HEAD`; inside Docker there is no .git, so it
// falls back to SOURCE_COMMIT (passed as a build arg by Coolify), then "unknown".

import { execSync } from 'node:child_process';

const shortGitHash = () => {
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (error) {
    const commit = (process.env.SOURCE_COMMIT || '').trim();

    return commit && commit !== 'unknown' ? commit.slice(0, 7) : 'unknown';
  }
};

export const buildInfo = (now = new Date()) => ({
  time: now.toISOString(),
  hash: shortGitHash(),
});

// CLI: `node tools/build-version.mjs` prints the stamp as JSON.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify(buildInfo()));
}
