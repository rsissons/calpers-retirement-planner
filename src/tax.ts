// Federal + California income tax, married filing jointly or single.
// Sources: IRS Rev. Proc. 2025-32 (tax year 2026); FTB 2025 Form 540 booklet and tax rate schedules;
// IRS Pub. 915 for the Social Security base amounts.
// Bracket thresholds and deductions are indexed forward from their base year at an inflation rate.

type Bracket = [upTo: number, rate: number];
export type FilingStatus = 'joint' | 'single';

interface Schedule {
  fed: Bracket[];
  fedStandardDeduction: number;
  fedAge65Each: number;         // Additional standard deduction per person 65+
  ca: Bracket[];
  caStandardDeduction: number;
  caPersonalCredits: number;    // Personal exemption credits (one per spouse)
  ssBase1: number;              // Social Security provisional-income base amounts, fixed in law
  ssBase2: number;
}

const FED_BASE_YEAR = 2026;
const CA_BASE_YEAR = 2025;
const CA_EXEMPTION_CREDIT = 153; // Per personal exemption, plus one more per person 65+
// The OBBB $6,000 senior deduction only runs 2025–2028, so it isn't modeled.
// California exemption credits phase out at high incomes (joint: above $504,411 federal AGI); not modeled.

const SCHEDULES: Record<FilingStatus, Schedule> = {
  joint: {
    fed: [[24_800, 0.10], [100_800, 0.12], [211_400, 0.22], [403_550, 0.24], [512_450, 0.32], [768_700, 0.35], [Infinity, 0.37]],
    fedStandardDeduction: 32_200,
    fedAge65Each: 1_650,
    ca: [[22_158, 0.01], [52_528, 0.02], [82_904, 0.04], [115_084, 0.06], [145_448, 0.08],
      [742_958, 0.093], [891_542, 0.103], [1_485_906, 0.113], [Infinity, 0.123]],
    caStandardDeduction: 11_412,
    caPersonalCredits: 2,
    ssBase1: 32_000,
    ssBase2: 44_000,
  },
  single: {
    fed: [[12_400, 0.10], [50_400, 0.12], [105_700, 0.22], [201_775, 0.24], [256_225, 0.32], [640_600, 0.35], [Infinity, 0.37]],
    fedStandardDeduction: 16_100,
    fedAge65Each: 2_050,
    ca: [[11_079, 0.01], [26_264, 0.02], [41_452, 0.04], [57_542, 0.06], [72_724, 0.08],
      [371_479, 0.093], [445_771, 0.103], [742_953, 0.113], [Infinity, 0.123]],
    caStandardDeduction: 5_706,
    caPersonalCredits: 1,
    ssBase1: 25_000,
    ssBase2: 34_000,
  },
};

function bracketTax(taxable: number, brackets: Bracket[], scale: number) {
  let tax = 0, floor = 0;
  for (const [upTo, rate] of brackets) {
    const top = upTo * scale;
    if (taxable <= floor) break;
    tax += (Math.min(taxable, top) - floor) * rate;
    floor = top;
  }
  return tax;
}

// Federally taxable portion of Social Security benefits (up to 85%)
export function taxableSocialSecurity(otherIncome: number, ss: number, filing: FilingStatus = 'joint') {
  if (ss <= 0) return 0;
  const { ssBase1, ssBase2 } = SCHEDULES[filing];
  const provisional = otherIncome + ss / 2;
  if (provisional <= ssBase1) return 0;
  if (provisional <= ssBase2) return Math.min(ss / 2, (provisional - ssBase1) / 2);
  return Math.min(0.85 * ss, 0.85 * (provisional - ssBase2) + Math.min(ss / 2, (ssBase2 - ssBase1) / 2));
}

export interface TaxYearInput {
  ordinaryIncome: number;   // Pensions, and every 403b distribution (conversions included)
  socialSecurity: number;   // Combined benefits for the year
  seniors: number;          // People on the return who are 65+ by year end
  taxYear: number;
  indexing: number;         // Annual inflation used to index brackets and deductions
  filing: FilingStatus;
}

export interface TaxResult {
  federal: number;
  california: number;
  total: number;
}

export function incomeTax({ ordinaryIncome, socialSecurity, seniors, taxYear, indexing, filing }: TaxYearInput): TaxResult {
  const s = SCHEDULES[filing];
  const fedScale = Math.pow(1 + indexing, Math.max(0, taxYear - FED_BASE_YEAR));
  const caScale = Math.pow(1 + indexing, Math.max(0, taxYear - CA_BASE_YEAR));

  const fedAGI = ordinaryIncome + taxableSocialSecurity(ordinaryIncome, socialSecurity, filing);
  const fedDeduction = (s.fedStandardDeduction + seniors * s.fedAge65Each) * fedScale;
  const federal = bracketTax(Math.max(0, fedAGI - fedDeduction), s.fed, fedScale);

  // California doesn't tax Social Security
  const caTaxable = Math.max(0, ordinaryIncome - s.caStandardDeduction * caScale);
  const caCredits = (s.caPersonalCredits + seniors) * CA_EXEMPTION_CREDIT * caScale;
  const california = Math.max(0, bracketTax(caTaxable, s.ca, caScale) - caCredits);

  return { federal, california, total: federal + california };
}

// Payroll taxes on wages (employee share). Sources: SSA 2026 fact sheet; IRS Topic 560; EDD 2026 SDI rate.
// The wage base and earnings-test limits are indexed forward from 2026 at the inflation rate.
const PAYROLL_BASE_YEAR = 2026;
const SS_TAX_RATE = 0.062;
const SS_WAGE_BASE = 184_500;             // Per worker
const MEDICARE_RATE = 0.0145;
const ADDL_MEDICARE_RATE = 0.009;         // On wages over $250K joint / $200K single, not indexed
const ADDL_MEDICARE_THRESHOLD: Record<FilingStatus, number> = { joint: 250_000, single: 200_000 };
const CA_SDI_RATE = 0.013;                // No wage cap since 2024

export const payrollScale = (year: number, indexing: number) =>
  Math.pow(1 + indexing, Math.max(0, year - PAYROLL_BASE_YEAR));

// Payroll tax on one month of wages, given what each worker and the household already earned this year
export function payrollTaxMonth(
  wages: number[], earnedBefore: number[], householdEarnedBefore: number, scale: number, filing: FilingStatus,
) {
  const base = SS_WAGE_BASE * scale;
  let tax = 0;
  wages.forEach((w, i) => {
    tax += SS_TAX_RATE * Math.max(0, Math.min(w, base - earnedBefore[i]));
    tax += (MEDICARE_RATE + CA_SDI_RATE) * w;
  });
  const threshold = ADDL_MEDICARE_THRESHOLD[filing];
  const total = wages.reduce((a, b) => a + b, 0);
  const over = Math.max(0, householdEarnedBefore + total - threshold) - Math.max(0, householdEarnedBefore - threshold);
  return tax + ADDL_MEDICARE_RATE * over;
}

// Social Security full retirement age in years, by birth year (SSA)
export function fullRetirementAge(birthDate: string) {
  const y = Number(birthDate.slice(0, 4));
  if (y <= 1954) return 66;
  if (y >= 1960) return 67;
  return 66 + (y - 1954) * 2 / 12;
}

// Social Security earnings test (SSA 2026): before full retirement age, $1 of benefits is held back
// for every $2 of wages over the limit; in the year FRA is reached, $1 per $3 over the higher limit,
// counting only wages before the FRA month. Benefits held back are credited back from FRA (not modeled).
// Grace year: the first year with a month of benefits and no work (wages under 1/12 of the limit),
// usually the year work stops, only the months worked can be held back.
const EARNINGS_TEST_LIMIT = 24_480;
const EARNINGS_TEST_FRA_YEAR_LIMIT = 65_160;
export function earningsTestHoldback(wagesBeforeFRA: number, reachesFRAThisYear: boolean, scale: number) {
  return reachesFRAThisYear
    ? Math.max(0, wagesBeforeFRA - EARNINGS_TEST_FRA_YEAR_LIMIT * scale) / 3
    : Math.max(0, wagesBeforeFRA - EARNINGS_TEST_LIMIT * scale) / 2;
}

// Wages above this in a month make it a "service month" for the grace-year rule
export const earningsTestMonthlyLimit = (reachesFRAThisYear: boolean, scale: number) =>
  (reachesFRAThisYear ? EARNINGS_TEST_FRA_YEAR_LIMIT : EARNINGS_TEST_LIMIT) * scale / 12;
