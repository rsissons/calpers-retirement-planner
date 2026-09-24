// Renames the single-file build to a name people recognize when it lands in Downloads.
import { renameSync, existsSync, statSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const from = 'release/index.html';
const to = `release/CalPERS-Retirement-Planner-${version}.html`;
if (!existsSync(from)) throw new Error(`${from} not found; did the build run?`);
renameSync(from, to);
console.log(`${to} (${(statSync(to).size / 1024).toFixed(0)} KB)`);
