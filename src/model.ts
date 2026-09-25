import type { Config } from './config';
import { sampleConfig } from './config';
import { calculatePension, withCalculatedPension } from './calpers';
import { withProjectedBalances } from './savings';
import { FORMULAS } from './formulas';

// The config the projection runs on: retirement age from the dates, the pension from the formula
// (when formula mode is on), and today's balances grown to the retirement date.
export function prepareConfig(config: Config): Config {
  const withAge = { ...config, retirementAge: calculatePension(config).ageYears };
  return withProjectedBalances(withCalculatedPension(withAge));
}

// --- Saving in the browser, and plan files ---
// The plan lives in this browser's localStorage only. Storage can be blocked (private windows,
// locked-down browsers), so every access is wrapped and the app still works without it.

const STORAGE_KEY = 'calpers-retirement-planner:v1';
export const FILE_FORMAT = 'calpers-retirement-planner';
export const FILE_VERSION = 2;

// Accepts a saved or imported object and returns a complete, valid Config, or null if it isn't one.
// Missing fields fall back to the sample, so files from older versions keep loading.
export function toConfig(raw: unknown): Config | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const data = (obj.format === FILE_FORMAT && obj.plan && typeof obj.plan === 'object') ? obj.plan as Record<string, unknown> : obj;
  if (typeof data.yourBirthDate !== 'string' || typeof data.yourRetirementDate !== 'string') return null;

  const merged: Record<string, unknown> = { ...sampleConfig };
  for (const [key, fallback] of Object.entries(sampleConfig)) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(fallback)) {
      if (Array.isArray(value)) merged[key] = value
        .filter(d => d && typeof d === 'object')
        .map(d => ({ name: String(d.name ?? 'Loan'), payment: Number(d.payment) || 0, endDate: String(d.endDate ?? sampleConfig.yourRetirementDate) }));
    } else if (typeof value === typeof fallback) {
      merged[key] = value;
    }
  }
  const config = merged as unknown as Config;
  // Before 1.2.0 the spouse's pay was take-home (untaxed). Keep those plans' numbers as they were.
  if (typeof data.spousePayIsGross !== 'boolean') config.spousePayIsGross = false;
  if (!FORMULAS.some(f => f.id === config.pensionFormulaId)) config.pensionFormulaId = sampleConfig.pensionFormulaId;
  return config;
}

export function loadSaved(): Config | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? toConfig(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

export function savePlan(config: Config) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* storage unavailable */ }
}

export function clearSaved() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
}

// Download the plan as a JSON file the person can keep, back up, or open on another device
export function exportPlan(config: Config) {
  const file = { format: FILE_FORMAT, version: FILE_VERSION, savedAt: new Date().toISOString(), plan: config };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = (config.planName || 'retirement-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'retirement-plan';
  a.href = url;
  a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importPlan(file: File): Promise<Config> {
  const text = await file.text();
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("That file isn't a plan file (it isn't valid JSON)."); }
  const config = toConfig(raw);
  if (!config) throw new Error("That file doesn't look like a plan from this planner.");
  return config;
}
