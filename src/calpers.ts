import type { Config } from './config';
import { formulaById, systemOf } from './formulas';
import type { PensionFormula, PensionSystem } from './formulas';

const QUARTER_LABELS = ['Exact', '¼ Year', '½ Year', '¾ Year'];
const MONTH_LABELS = Array.from({ length: 12 }, (_, m) => `${m} mo`);

// Column headings for a formula's table: quarter years (CalPERS) or months (CalSTRS)
export const columnLabels = (formula: PensionFormula) =>
  formula.table[0].factors.length === 12 ? MONTH_LABELS : QUARTER_LABELS;

export interface PensionCalc {
  formula: PensionFormula;
  system: PensionSystem;
  ageYears: number;      // Completed years at retirement (CalSTRS: on the last day of the retirement month)
  ageMonths: number;     // Completed months beyond ageYears
  column: number;        // Table column: 0-3 quarter years (CalPERS) or 0-11 months (CalSTRS)
  tableAge: number;      // Row used in the formula's table (its last row covers that age and older)
  ageFactor: number;     // e.g. 0.02282, including any career factor
  careerFactor: number;  // CalSTRS 2% at 60 with 30+ years: what the career factor added (0 otherwise)
  serviceYears: number;  // Service credit at retirement date
  benefitPercent: number; // ageFactor × serviceYears, limited by the formula's cap
  capped: boolean;       // True when the formula's maximum percentage kicked in
  unmodified: number;    // Monthly unmodified allowance
  optionAmount: number;  // Monthly allowance after the beneficiary option reduction
  eligible: boolean;     // False if under the formula's minimum retirement age (and any early-retirement rule)
}

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
};

// Completed years and months between two ISO dates
function ageAt(birth: string, on: string) {
  const b = parseDate(birth), r = parseDate(on);
  let months = (r.y - b.y) * 12 + (r.m - b.m);
  if (r.d < b.d) months--;
  return { years: Math.floor(months / 12), months: months % 12 };
}

// Age in years (completed months ÷ 12) on an ISO date
export function ageOn(birth: string, on: string) {
  const { years, months } = ageAt(birth, on);
  return years + months / 12;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// Last day of the date's month
export function endOfMonth(date: string) {
  const { y, m } = parseDate(date);
  return iso(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
}

// 1st of the month, n months after the given date's month
export function firstOfMonthAfter(date: string, n: number) {
  const { y, m } = parseDate(date);
  const idx = y * 12 + (m - 1) + n;
  return iso(Math.floor(idx / 12), (idx % 12) + 1, 1);
}

// Date of the birthday on which someone turns `age`
export function birthdayAt(birth: string, age: number) {
  const { y, m, d } = parseDate(birth);
  return iso(y + age, m, d);
}

// Same month/day as `date`, in the year someone born on `birth` is `age` on that day
export function dateAtAge(birth: string, date: string, age: number) {
  const b = parseDate(birth), t = parseDate(date);
  const beforeBirthday = t.m < b.m || (t.m === b.m && t.d < b.d);
  return iso(b.y + age + (beforeBirthday ? 1 : 0), t.m, t.d);
}

// Whole calendar months from one ISO date to another (negative if earlier)
export function monthsBetween(from: string, to: string) {
  const a = parseDate(from), b = parseDate(to);
  return (b.y - a.y) * 12 + (b.m - a.m);
}

// Age when required minimum distributions start (SECURE 2.0): 75 if born 1960 or later, 73 if 1951–1959
export function rmdStartAge(birthDate: string) {
  const year = parseDate(birthDate).y;
  return year >= 1960 ? 75 : year >= 1951 ? 73 : 72;
}

// Table factor for an age (row clamped to the table; column = quarter or month)
export function lookupAgeFactor(formula: PensionFormula, ageYears: number, column: number): number {
  const first = formula.table[0].age, last = formula.table[formula.table.length - 1].age;
  const row = formula.table.find(r => r.age === Math.min(Math.max(ageYears, first), last))!;
  return row.factors[column];
}

export function calculatePension(config: Config): PensionCalc {
  const formula = formulaById(config.pensionFormulaId);
  const system = systemOf(formula);
  // CalSTRS uses your age on the last day of the month your retirement is effective
  const { years, months } = ageAt(config.yourBirthDate,
    system === 'CalSTRS' ? endOfMonth(config.yourRetirementDate) : config.yourRetirementDate);
  const column = Math.floor(months / (12 / formula.table[0].factors.length));

  // Service keeps accruing (full-time) from the service credit date to the retirement date
  const serviceYears = Math.max(0,
    config.serviceCreditYears + monthsBetween(config.serviceCreditAsOf, config.yourRetirementDate) / 12);

  const early = formula.earlyRetirement;
  const eligible = years >= formula.minAge || (!!early && years >= early.age && serviceYears >= early.serviceYears);
  const tableFactor = eligible ? lookupAgeFactor(formula, years, column) : 0;
  const cf = formula.careerFactor;
  const ageFactor = eligible && cf && serviceYears >= cf.serviceYears ? Math.min(tableFactor + cf.add, cf.max) : tableFactor;

  const rawPercent = ageFactor * serviceYears;
  const benefitPercent = formula.maxPercent === null ? rawPercent : Math.min(rawPercent, formula.maxPercent);
  const unmodified = benefitPercent * config.finalCompensation;
  const lastAge = formula.table[formula.table.length - 1].age;

  return {
    formula,
    system,
    ageYears: years,
    ageMonths: months,
    column,
    tableAge: Math.min(Math.max(years, formula.table[0].age), lastAge),
    ageFactor,
    careerFactor: ageFactor - tableFactor,
    serviceYears,
    benefitPercent,
    capped: benefitPercent < rawPercent,
    unmodified,
    optionAmount: unmodified * config.beneficiaryOptionFactor,
    eligible,
  };
}

// Config with pensionStart replaced by the formula result when formula mode is on
export function withCalculatedPension(config: Config): Config {
  if (!config.pensionFromFormula) return config;
  return { ...config, pensionStart: calculatePension(config).optionAmount };
}
