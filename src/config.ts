import { DEFAULT_FORMULA_ID } from './formulas';

export interface Debt {
  name: string;
  payment: number;   // Fixed monthly payment (not inflated)
  endDate: string;   // Month of the final payment
}

export interface Config {
  // Who the plan is for
  planName: string;              // Shown in the menu header
  yourName: string;              // The CalPERS member
  hasSpouse: boolean;            // Off = single filer, one person's Medicare and Social Security
  spouseName: string;

  projectionEndAge: number;      // Your age in the last projected year

  starting403b: number;           // Derived: current403b grown to the retirement date
  startingRoth: number;

  current403b: number;             // 403(b)/457(b) balance today
  current403bAsOf: string;
  monthly403bContribution: number; // Payroll deferral until retirement

  startingCash: number;              // Derived: currentSavings grown to the retirement date
  currentSavings: number;            // Cash savings today
  savingsAsOf: string;
  monthlySavingsContribution: number; // Added to savings each month until retirement
  savingsRate: number;               // Savings account APY

  debts: Debt[];                     // Fixed loan payments, each ending on its own date

  annualReturn: number;

  pensionStart: number;          // Monthly pension used when pensionFromFormula is off
  pensionCOLA: number;

  // CalPERS formula inputs
  pensionFromFormula: boolean;    // Derive pensionStart from age factor × service × final comp
  pensionFormulaId: string;       // A FORMULAS id (see formulas.ts)
  yourBirthDate: string;
  finalCompensation: number;      // Monthly final compensation (classic: highest 12 months; PEPRA: highest 36)
  serviceCreditYears: number;     // Service credit as of serviceCreditAsOf
  serviceCreditAsOf: string;
  beneficiaryOptionFactor: number; // Option allowance ÷ unmodified (1 = unmodified)

  // Spouse (ignored when hasSpouse is off)
  spouseBirthDate: string;
  spouseSalary: number;          // Monthly pay while working: gross (taxed) or, in older plans, take-home
  spousePayIsGross: boolean;     // Plans saved before 1.2.0 entered take-home pay; those load with this off
  spouseRetirementDate: string;  // Their pay stops; their pension starts
  spousePension: number;         // Monthly pension of their own, from their retirement date (taxable)
  spouseSS: number;              // Monthly Social Security at spouseSSStartAge
  spouseSSStartAge: number;

  yourSS: number;
  yourSSStartAge: number;

  jobPay: number;                 // Your monthly GROSS pay from a job after retiring (0 = none)
  jobEndAge: number;              // Works from the month after retirement until this age

  essentialSpending: number;
  discretionarySpending: number;
  workCostsEnding: number;        // Monthly costs that stop at retirement (commute), off essential spending
  spendingInflation: number;

  bankSurplus: boolean;           // Months with income left over add it to cash savings (off = it's spent)

  taxFromBrackets: boolean;       // Federal + California brackets; off = flat effectiveTaxRate
  effectiveTaxRate: number;

  rothExtraWithdrawal: number;

  // Retiree health. Out-of-pocket = premium for the current tier − the employer's fixed contribution,
  // plus Medicare Part B for each person on Medicare. Tiers are by how many of you are on Medicare
  // (single: "none" = you before Medicare, "one" = you on Medicare).
  healthEmployerCap: number;      // Employer's monthly contribution in retirement (fixed dollars)
  healthRatesYear: number;        // Year the three premiums below are from
  healthPremiumNoMedicare: number;
  healthPremiumOneMedicare: number;
  healthPremiumBothMedicare: number;
  partBPremium: number;           // Standard Part B premium per person
  partBYear: number;
  medicareAge: number;
  healthcareInflation: number;    // Annual growth of premiums and Part B

  retirementAge: number;          // Derived from the retirement date (kept in step by prepareConfig)
  yourRetirementDate: string;

  maxMonthlyConversion: number;
}

// A made-up household so the dashboard shows something on first open. Nothing here is anyone's real data.
export const sampleConfig: Config = {
  planName: 'Sample Plan',
  yourName: 'Pat',
  hasSpouse: true,
  spouseName: 'Jordan',

  projectionEndAge: 95,

  starting403b: 0,
  current403b: 180000,
  current403bAsOf: '2026-09-01',
  monthly403bContribution: 800,

  startingCash: 0,
  currentSavings: 30000,
  savingsAsOf: '2026-09-01',
  monthlySavingsContribution: 300,
  savingsRate: 0.035,

  debts: [
    { name: 'Mortgage P&I', payment: 2100, endDate: '2045-08-01' },
    { name: 'Car loan', payment: 450, endDate: '2028-05-01' },
  ],
  startingRoth: 25000,

  annualReturn: 0.06,

  pensionStart: 5000,
  pensionCOLA: 0.02,

  pensionFromFormula: true,
  pensionFormulaId: DEFAULT_FORMULA_ID,
  yourBirthDate: '1968-06-15',
  finalCompensation: 10500,
  serviceCreditYears: 24,
  serviceCreditAsOf: '2026-07-01',
  beneficiaryOptionFactor: 0.93,

  spouseBirthDate: '1969-03-10',
  spouseSalary: 5800,
  spousePayIsGross: true,
  spouseRetirementDate: '2032-03-10',
  spousePension: 0,
  spouseSS: 1600,
  spouseSSStartAge: 67,

  yourSS: 1200,
  yourSSStartAge: 67,

  jobPay: 0,
  jobEndAge: 65,

  essentialSpending: 5200,
  discretionarySpending: 1800,
  workCostsEnding: 200,
  spendingInflation: 0.02,

  bankSurplus: true,

  taxFromBrackets: true,
  effectiveTaxRate: 0.12,

  rothExtraWithdrawal: 0,

  // CalPERS 2027 Kaiser, Region 3 (LA/Riverside/San Bernardino), subscriber + 1. Look up your own region and plan.
  healthEmployerCap: 800,
  healthRatesYear: 2027,
  healthPremiumNoMedicare: 2022.56,
  healthPremiumOneMedicare: 1345.21,
  healthPremiumBothMedicare: 667.86,
  partBPremium: 202.90,           // CMS 2026 standard premium
  partBYear: 2026,
  medicareAge: 65,
  healthcareInflation: 0.05,

  retirementAge: 62,
  yourRetirementDate: '2030-06-30',

  maxMonthlyConversion: 1000,
};
