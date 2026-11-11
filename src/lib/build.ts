// Build provenance for the colophon: when, and from which commit.
import { execSync } from 'node:child_process';

function commit(): string {
  const fromHost = process.env['VERCEL_GIT_COMMIT_SHA'];
  if (fromHost) return fromHost.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
}

export const builtAt = new Date();
export const buildCommit = commit();
