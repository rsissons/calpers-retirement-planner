// Drive headless Chrome over the DevTools protocol: open a page at an exact viewport, click by text, screenshot.
// Usage: npm run ui-check -- <url or file:// path> <screenshot prefix> [width] [height]
// Clears saved data, clicks through the sample banner, the CalPERS/CalSTRS picker and the Guide, prints a report
// (header text, no sideways scroll, formula switching, script errors) and saves screenshots. Needs Chrome.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, out, width = '1280', height = '900'] = process.argv.slice(2);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map(a => a.value ?? a.description).join(' '));
});
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}-${name}.png`, Buffer.from(r.result.data, 'base64'));
};
const clickText = async (text, sel = 'button') => evaluate(`(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(b => b.textContent.includes(${JSON.stringify(text)}));
  if (!el) return false; el.click(); return true; })()`);

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: +width < 600 });
await send('Page.navigate', { url });
await sleep(1500);
await evaluate('localStorage.clear()'); await send('Page.reload'); await sleep(1500);

const report = {};
report.headerText = await evaluate(`document.querySelector('header').innerText.replace(/\\s+/g, ' ')`);
report.noSideScroll = await evaluate('document.documentElement.scrollWidth <= window.innerWidth');
await shot('guide');
report.clickedBanner = await clickText('Enter my numbers');
await sleep(900);
report.pensionTop = await evaluate(`Math.round(document.getElementById('pension-setup')?.getBoundingClientRect().top ?? -1)`);
await shot('pension');
report.formulaOptionsPERS = await evaluate(`document.getElementById('f-pensionFormulaId').options.length`);
report.clickedCalSTRS = await clickText('CalSTRS', '[role=radio]');
await sleep(500);
report.formulaAfter = await evaluate(`document.getElementById('f-pensionFormulaId').value`);
report.formulaOptionsSTRS = await evaluate(`document.getElementById('f-pensionFormulaId').options.length`);
report.cardTitle = await evaluate(`document.querySelector('#pension-setup h3').innerText`);
report.chip = await evaluate(`[...document.querySelectorAll('header button')].map(b => b.innerText).join(' | ')`);
report.noSideScrollAfter = await evaluate('document.documentElement.scrollWidth <= window.innerWidth');
await shot('calstrs');
report.clickedGuide = await clickText('Guide', 'aside button');
await sleep(400);
await evaluate(`[...document.querySelectorAll('h3')].find(h => h.textContent === 'What to gather')?.scrollIntoView()`);
await sleep(300);
await shot('gather');
report.errors = errors;
console.log(JSON.stringify(report, null, 1));
ws.close(); chrome.kill();
