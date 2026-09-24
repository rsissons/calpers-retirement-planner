// Publishes dist/ to the gh-pages branch, which GitHub Pages serves.
// Run `npm run build` first (or use `npm run publish:pages`, which does both).
import { execSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
if (!existsSync('dist/index.html')) throw new Error('dist/ is missing; run npm run build first');

const remote = execSync('git remote get-url origin').toString().trim();
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const dir = mkdtempSync(join(tmpdir(), 'pages-'));
try {
  cpSync('dist', dir, { recursive: true });
  writeFileSync(join(dir, '.nojekyll'), '');   // serve files as-is, no Jekyll processing
  run('git init -q -b gh-pages', dir);
  run('git add -A', dir);
  run(`git commit -q -m "Publish site from ${commit}"`, dir);
  run(`git push -f "${remote}" gh-pages`, dir);
  console.log(`Published ${commit} to gh-pages`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
