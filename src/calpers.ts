import type { Config } from './config';
import { formulaById } from './formulas';
import type { PensionFormula } from './formulas';

export const QUARTER_LABELS = ['Exact', '¼ Year', '½ Year', '¾ Year'] as const;

export interface PensionCalc {
  formula: PensionFormula;
  ageYears: number;      // Completed years at retirement date
  ageMonths: number;     // Completed months beyond ageYears
  quarter: number;       // 0-3 → exact, ¼, ½, ¾
  tableAge: number;      // Row used in the formula's table (its last row covers that age and older)
  ageFactor: number;     // e.g. 0.02282
  serviceYears: number;  // Service credit at retirement date
  benefitPercent: number; // ageFactor × serviceYears, limited by the formula's cap
  capped: boolean;       // True when the formula's maximum percentage kicked in
  unmodified: number;    // Monthly unmodified allowance
  optionAmount: number;  // Monthly allowance after the beneficiary option reduction
  eligible: boolean;     // False if under the formula's minimum retirement age
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

export function lookupAgeFactor(formula: PensionFormula, ageYears: number, quarter: number): number {
  if (ageYears < formula.minAge) return 0;
  const first = formula.table[0].age, last = formula.table[formula.table.length - 1].age;
  const row = formula.table.find(r => r.age === Math.min(Math.max(ageYears, first), last))!;
  return row.factors[quarter];
}

export function calculatePension(config: Config): PensionCalc {
  const formula = formulaById(config.pensionFormulaId);
  const { years, months } = ageAt(config.yourBirthDate, config.yourRetirementDate);
  const quarter = Math.floor(months / 3);
  const ageFactor = lookupAgeFactor(formula, years, quarter);

  // Service keeps accruing (full-time) from the service credit date to the retirement date
  const serviceYears = Math.max(0,
    config.serviceCreditYears + monthsBetween(config.serviceCreditAsOf, config.yourRetirementDate) / 12);

  const rawPercent = ageFactor * serviceYears;
  const benefitPercent = formula.maxPercent === null ? rawPercent : Math.min(rawPercent, formula.maxPercent);
  const unmodified = benefitPercent * config.finalCompensation;
  const lastAge = formula.table[formula.table.length - 1].age;

  return {
    formula,
    ageYears: years,
    ageMonths: months,
    quarter,
    tableAge: Math.min(Math.max(years, formula.table[0].age), lastAge),
    ageFactor,
    serviceYears,
    benefitPercent,
    capped: benefitPercent < rawPercent,
    unmodified,
    optionAmount: unmodified * config.beneficiaryOptionFactor,
    eligible: years >= formula.minAge,
  };
}

// Config with pensionStart replaced by the formula result when formula mode is on
export function withCalculatedPension(config: Config): Config {
  if (!config.pensionFromFormula) return config;
  return { ...config, pensionStart: calculatePension(config).optionAmount };
}
