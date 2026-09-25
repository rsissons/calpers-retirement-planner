import type { Config } from './config';
import { ageOn, firstOfMonthAfter, rmdStartAge } from './calpers';
import { incomeTax, payrollTaxMonth, payrollScale, earningsTestHoldback, earningsTestMonthlyLimit, fullRetirementAge } from './tax';

// Calendar month index (year*12 + month) for an ISO date
const monthIndexOf = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return y * 12 + (m - 1);
};

export interface MonthlyData {
  age: number;
  yearIndex: number;
  monthIndex: number; // 0-11

  // Income
  pension: number;
  spousePension: number;
  spouseSalary: number;
  jobPay: number;           // Your gross pay from a job after retiring
  spouseSS: number;         // After any earnings-test holdback
  yourSS: number;           // After any earnings-test holdback
  spouseSSHeld: number;     // Social Security held back by the earnings test
  yourSSHeld: number;
  totalIncome: number;

  // Expenses & Taxes
  essentialSpending: number;
  discretionarySpending: number;
  debtPayments: number;     // Fixed loan payments still active this month
  insurance: number;        // Health premium above the employer's contribution
  medicare: number;         // Medicare Part B premiums
  onMedicare: number;       // How many people are on Medicare (0–2)
  incomeTaxes: number;      // Tax on pensions, wages, 403b withdrawals, SS (older plans' take-home pay excluded)
  payrollTaxes: number;     // FICA + CA SDI on gross wages
  conversionTaxes: number;  // Tax on 403b→Roth conversions
  rmdTaxes: number;         // Tax on the RMD top-up, paid out of the withdrawal
  taxes: number;            // Total taxes (income + payroll + conversion + RMD)
  totalExpenses: number;

  // Net Income & Gap
  netIncome: number;
  gap: number;

  // Withdrawals & Conversions
  withdrawalCash: number;
  withdrawal403b: number;
  withdrawalRoth: number;
  conversionToRoth: number;
  rmdWithdrawal: number;    // Extra 403b withdrawal to satisfy the RMD, moved to cash savings

  // Balances
  balanceCash: number;      // Cash savings, plus any unspent RMDs
  balance403b: number;
  balanceRoth: number;
}

export interface YearlyData {
  age: number;
  yearIndex: number;

  totalPension: number;
  totalSpousePension: number;
  totalSpouseSalary: number;
  totalJobPay: number;
  totalSpouseSS: number;
  totalYourSS: number;
  totalSSHeldBack: number;
  totalIncome: number;

  totalEssentialSpending: number;
  totalDiscretionarySpending: number;
  totalDebtPayments: number;
  totalInsurance: number;
  totalMedicare: number;
  totalIncomeTaxes: number;
  totalPayrollTaxes: number;
  totalConversionTaxes: number;
  totalTaxes: number;
  totalExpenses: number;

  totalNetIncome: number;
  totalGap: number;

  totalWithdrawal403b: number;
  totalWithdrawalCash: number;
  totalWithdrawalRoth: number;
  totalConversionToRoth: number;
  rmdRequired: number;          // IRS minimum 403b distribution for the year (0 before RMD age)
  totalRmdWithdrawal: number;   // Portion not already covered by conversions/withdrawals
  totalRmdTaxes: number;

  endBalance403b: number;
  endBalanceCash: number;
  endBalanceRoth: number;

  notes: string[];

  months: MonthlyData[];
}

export interface ProjectionResult {
  yearly: YearlyData[];
  metrics: {
    year403bDepleted: number | null;
    peakRothBalance: number;
    rothBalanceAt85: number;
    lifetimePension: number;
    lifetimeSS: number;
    total403bWithdrawn: number;
    totalRothWithdrawn: number;
    safeWithdrawalRate: number;
    bucketIncome: number;
    bucketConservative: number;
    bucketModerate: number;
  };
}

// IRS Uniform Lifetime Table (Pub 590-B, Appendix B, Table III), ages 72–120
const UNIFORM_LIFETIME: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
};
const rmdDivisor = (age: number) => UNIFORM_LIFETIME[Math.min(age, 119)] ?? 2.0;

// Helper used in note generation
const formatNote = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function calculateProjection(config: Config): ProjectionResult {
  let current403b = config.starting403b;
  let currentCash = config.startingCash;
  let currentRoth = config.startingRoth;

  const spouse = config.hasSpouse;
  const you = config.yourName || 'You';
  const partner = config.spouseName || 'Spouse';
  const rmdAge = rmdStartAge(config.yourBirthDate);
  const filing = spouse ? 'joint' : 'single';
  const spouseGross = spouse && config.spousePayIsGross;
  const yourFRA = fullRetirementAge(config.yourBirthDate);
  const spouseFRA = fullRetirementAge(config.spouseBirthDate);

  // All config spending/income values are MONTHLY figures.
  // CalPERS COLA: first on May 1 of the second calendar year after retiring, then every May.
  const firstColaYear = Number(config.yourRetirementDate.slice(0, 4)) + 2;
  let currentSpouseSS = config.spouseSS;
  let currentYourSS = config.yourSS;
  let currentSpousePension = config.spousePension;
  // Essential spending in retirement: today's figure minus work costs (commute) that stop at retirement
  let currentEssentialSpending = Math.max(0, config.essentialSpending - config.workCostsEnding);
  let currentDiscretionarySpending = config.discretionarySpending;

  const yearlyData: YearlyData[] = [];

  let year403bDepleted: number | null = null;
  const graceYearUsed = { you: false, spouse: false }; // SS earnings test: each person's one grace year
  let peakRothBalance = currentRoth;
  let rothBalanceAt85 = 0;

  let total403bWithdrawn = 0;
  let totalRothWithdrawn = 0;

  let lifetimePension = 0;
  let lifetimeSS = 0;

  let bucketIncome = 0;
  let bucketConservative = 0;
  let bucketModerate = 0;

  let year1TotalWithdrawals = 0;
  const year1StartingAssets = config.startingCash + config.starting403b + config.startingRoth;
  const retirementMonthIndex = monthIndexOf(config.yourRetirementDate);
  const debtEnds = config.debts.map(d => monthIndexOf(d.endDate));

  // Plan years run from your retirement age through projectionEndAge (at least one year)
  const projectionYears = Math.max(1, config.projectionEndAge - config.retirementAge + 1);

  for (let year = 0; year < projectionYears; year++) {
    const currentAge = config.retirementAge + year;

    // Annual SS COLA, spouse pension COLA and spending inflation applied at the start of each new plan year
    if (year > 0) {
      currentSpouseSS *= (1 + config.pensionCOLA);
      currentYourSS *= (1 + config.pensionCOLA);
      currentSpousePension *= (1 + config.pensionCOLA);
      currentEssentialSpending *= (1 + config.spendingInflation);
      currentDiscretionarySpending *= (1 + config.spendingInflation);
    }

    const yearObj: YearlyData = {
      age: currentAge,
      yearIndex: year,
      totalPension: 0,
      totalSpousePension: 0,
      totalSpouseSalary: 0,
      totalJobPay: 0,
      totalSpouseSS: 0,
      totalYourSS: 0,
      totalSSHeldBack: 0,
      totalIncome: 0,
      totalEssentialSpending: 0,
      totalDiscretionarySpending: 0,
      totalDebtPayments: 0,
      totalInsurance: 0,
      totalMedicare: 0,
      totalIncomeTaxes: 0,
      totalPayrollTaxes: 0,
      totalConversionTaxes: 0,
      totalTaxes: 0,
      totalExpenses: 0,
      totalNetIncome: 0,
      totalGap: 0,
      totalWithdrawal403b: 0,
      totalWithdrawalCash: 0,
      totalWithdrawalRoth: 0,
      totalConversionToRoth: 0,
      rmdRequired: 0,
      totalRmdWithdrawal: 0,
      totalRmdTaxes: 0,
      endBalance403b: 0,
      endBalanceCash: 0,
      endBalanceRoth: 0,
      notes: [],
      months: []
    };

    // Tax year = the calendar year holding most of this plan year's months
    const taxYear = Number(firstOfMonthAfter(config.yourRetirementDate, year * 12 + 7).slice(0, 4));
    const yearEnd = `${taxYear}-12-31`;
    const seniors = (spouse ? [config.yourBirthDate, config.spouseBirthDate] : [config.yourBirthDate])
      .filter(birth => ageOn(birth, yearEnd) >= 65).length;

    // RMD: from the year you turn the RMD age, the 403b balance at the start of the year
    // divided by the IRS Uniform Lifetime divisor for your age at year end must come out
    const yourAgeAtYearEnd = Math.floor(ageOn(config.yourBirthDate, yearEnd));
    const rmdRequired = yourAgeAtYearEnd >= rmdAge && current403b > 0
      ? current403b / rmdDivisor(yourAgeAtYearEnd)
      : 0;

    // Wages don't depend on balances, so the year's paychecks and the Social Security earnings test are
    // set up front. The test counts each person's wages before their full retirement age; the holdback
    // is spread over the months it can apply to (SSA withholds whole checks; the total is the same). In a
    // person's grace year that's only the SS months they work; otherwise every SS month before FRA.
    const payScale = payrollScale(taxYear, config.spendingInflation);
    const monthDates = Array.from({ length: 12 }, (_, m) => firstOfMonthAfter(config.yourRetirementDate, year * 12 + m + 1));
    const earningsTest = (who: 'you' | 'spouse', birthDate: string, fra: number, ssStartAge: number, ss: number, wages: number[]) => {
      const beforeFRA = monthDates.map(d => ageOn(birthDate, d) < fra);
      const ssBeforeFRA = monthDates.map((d, m) => beforeFRA[m] && ageOn(birthDate, d) >= ssStartAge);
      const wagesBeforeFRA = wages.reduce((sum, w, m) => sum + (beforeFRA[m] ? w : 0), 0);
      const reachesFRA = beforeFRA.some(b => b) && beforeFRA.some(b => !b);
      const worked = wages.map(w => w > earningsTestMonthlyLimit(reachesFRA, payScale));
      const graceYear = !graceYearUsed[who] && ssBeforeFRA.some((on, m) => on && !worked[m]);
      if (graceYear) graceYearUsed[who] = true;
      const held = ssBeforeFRA.map((on, m) => on && (!graceYear || worked[m]));
      const count = held.filter(Boolean).length;
      return { held, perMonth: count > 0 ? Math.min(ss, earningsTestHoldback(wagesBeforeFRA, reachesFRA, payScale) / count) : 0 };
    };
    const jobPayIn = monthDates.map(d => ageOn(config.yourBirthDate, d) < config.jobEndAge ? config.jobPay : 0);
    const spousePayIn = monthDates.map(d => spouse && d < config.spouseRetirementDate ? config.spouseSalary : 0);
    const yourTest = earningsTest('you', config.yourBirthDate, yourFRA, config.yourSSStartAge, currentYourSS, jobPayIn);
    const spouseTest = earningsTest('spouse', config.spouseBirthDate, spouseFRA, config.spouseSSStartAge, currentSpouseSS, spousePayIn);

    // Each month's wages, known up front
    const wagesIn = monthDates.map((_, m) => jobPayIn[m] + (spouseGross ? spousePayIn[m] : 0));
    const yearWages = wagesIn.reduce((a, b) => a + b, 0);

    // Simulate the year's 12 months from the current balances. With bracket taxes, the tax the year's
    // wages add is charged in the months they're paid (like paycheck withholding), the rest of the annual
    // tax is spread evenly, and the year is re-run until that tax matches the income it actually produced
    // (403b withdrawals are taxable, and some of them go to paying the tax).
    let annualWageTax = 0;
    const simulateYear = (annualIncomeTax: number, annualConversionTax: number, annualRmdTax: number) => {
      let bal403b = current403b;
      let balCash = currentCash;
      let balRoth = currentRoth;
      let distributed403b = 0;   // Everything taken out of the 403b this year (counts toward the RMD)
      const months: MonthlyData[] = [];
      let ordinaryBase = 0;      // Pensions + gross wages + 403b withdrawals for spending
      let yourWages = 0, spouseWages = 0; // Gross wages so far this year (payroll-tax wage base)
      let conversionIncome = 0;  // Conversions + conversion taxes paid out of the 403b
      let rmdIncome = 0;         // RMD top-up beyond what the year already took out
      let socialSecurity = 0;

      for (let month = 0; month < 12; month++) {
        // Monthly compounding
        bal403b *= (1 + (config.annualReturn / 12));
        balCash *= (1 + (config.savingsRate / 12));
        balRoth *= (1 + (config.annualReturn / 12));

        // Real calendar month being modeled: the first is the month after your retirement date.
        // Ages come from actual birth dates, not the rounded retirement age.
        const monthDate = monthDates[month];
        const colaCount = Math.max(0,
          Number(monthDate.slice(0, 4)) - firstColaYear + (Number(monthDate.slice(5, 7)) >= 5 ? 1 : 0));
        const pension = config.pensionStart * Math.pow(1 + config.pensionCOLA, colaCount);
        const yourCurrentAge = ageOn(config.yourBirthDate, monthDate);
        const spouseCurrentAge = spouse ? ageOn(config.spouseBirthDate, monthDate) : 0;

        // Spouse: pay every month that starts before their retirement date, then their own pension
        const spouseWorking = spouse && monthDate < config.spouseRetirementDate;
        const spouseSalary = spousePayIn[month];
        const spousePension = spouse && !spouseWorking ? currentSpousePension : 0;
        // Your job after retiring: gross pay every month before jobEndAge
        const jobPay = jobPayIn[month];

        // Social Security: each person's starts in the month they reach their chosen start age,
        // less any earnings-test holdback before their full retirement age
        const spouseOnSS = spouse && spouseCurrentAge >= config.spouseSSStartAge;
        const youOnSS = yourCurrentAge >= config.yourSSStartAge;
        const spouseSSHeld = spouseOnSS && spouseTest.held[month] ? spouseTest.perMonth : 0;
        const yourSSHeld = youOnSS && yourTest.held[month] ? yourTest.perMonth : 0;
        const spouseSS = spouseOnSS ? currentSpouseSS - spouseSSHeld : 0;
        const yourSS = youOnSS ? currentYourSS - yourSSHeld : 0;

        const totalIncome = pension + spousePension + spouseSalary + jobPay + spouseSS + yourSS;

        // Payroll tax (FICA + CA SDI) on this month's gross wages. Older plans' take-home pay is already net.
        const spouseGrossPay = spouseGross ? spouseSalary : 0;
        const payrollTaxes = payrollTaxMonth([jobPay, spouseGrossPay], [yourWages, spouseWages], yourWages + spouseWages, payScale, filing);
        yourWages += jobPay;
        spouseWages += spouseGrossPay;

        const essentialSpending = currentEssentialSpending;
        const discretionarySpending = currentDiscretionarySpending;
        // Fixed loan payments (not inflated); each stops after its final payment month.
        // Projection month 0 is the month after the retirement date.
        const calendarMonth = retirementMonthIndex + 1 + year * 12 + month;
        const debtPayments = config.debts.reduce((sum, d, i) => sum + (calendarMonth <= debtEnds[i] ? d.payment : 0), 0);
        // Healthcare: premiums reset each January, growing at healthcareInflation. The employer's
        // contribution is a fixed dollar amount, so every increase lands on the household.
        const calendarYear = Number(monthDate.slice(0, 4));
        const youOnMedicare = yourCurrentAge >= config.medicareAge;
        const spouseOnMedicare = spouse && spouseCurrentAge >= config.medicareAge;
        const medicareCount = (youOnMedicare ? 1 : 0) + (spouseOnMedicare ? 1 : 0);
        const premium = [config.healthPremiumNoMedicare, config.healthPremiumOneMedicare, config.healthPremiumBothMedicare][medicareCount]
          * Math.pow(1 + config.healthcareInflation, calendarYear - config.healthRatesYear);
        const insurance = Math.max(0, premium - config.healthEmployerCap);
        const medicare = medicareCount * config.partBPremium
          * Math.pow(1 + config.healthcareInflation, calendarYear - config.partBYear);

        // Income taxes: the year's bracket tax spread monthly, or the flat rate on taxable income.
        // Take-home pay (older plans) is already taxed by withholding, so it's left out of both.
        const incomeTaxes = config.taxFromBrackets
          ? (annualIncomeTax - annualWageTax) / 12 + (yearWages > 0 ? annualWageTax * wagesIn[month] / yearWages : 0)
          : (totalIncome - (spouseSalary - spouseGrossPay)) * config.effectiveTaxRate;

        // --- Step 1: Roth conversion (account TRANSFER, NOT spending) ---
        let withdrawal403b = 0;
        let withdrawalCash = 0;
        let withdrawalRoth = 0;
        let conversionToRoth = 0;
        let rmdWithdrawal = 0;

        if (bal403b > 0) {
          conversionToRoth = Math.min(bal403b, config.maxMonthlyConversion);
          bal403b -= conversionToRoth;
          balRoth += conversionToRoth;
        }

        // Conversion taxes: real IRS cost, but NOT living expenses.
        // Deducted directly from 403b (separate from spending gap).
        const conversionTaxes = config.taxFromBrackets
          ? annualConversionTax / 12
          : conversionToRoth * config.effectiveTaxRate;
        let conversionTaxFrom403b = 0;
        if (conversionTaxes > 0) {
          if (bal403b >= conversionTaxes) {
            bal403b -= conversionTaxes;
            conversionTaxFrom403b = conversionTaxes;
            conversionIncome += conversionTaxes;
          } else if (balRoth >= conversionTaxes) {
            balRoth -= conversionTaxes;
          }
        }

        // --- Step 2: Total Spend = REAL living expenses only (no conversion costs) ---
        const totalExpenses = essentialSpending + discretionarySpending + debtPayments + insurance + medicare + incomeTaxes + payrollTaxes;
        const netIncome = totalIncome - incomeTaxes - payrollTaxes - insurance - medicare;

        // Gap: income vs real living expenses only
        const gap = totalExpenses - totalIncome;

        // --- Step 3: Cover any shortfall from cash savings first, then 403b, then Roth ---
        let remainingGap = gap > 0 ? gap : 0;
        // A surplus month banks the leftover in cash savings (otherwise it's assumed spent)
        if (config.bankSurplus && gap < 0) balCash += -gap;

        if (balCash > 0 && remainingGap > 0) {
          withdrawalCash = Math.min(balCash, remainingGap);
          balCash -= withdrawalCash;
          remainingGap -= withdrawalCash;
        }

        if (bal403b > 0 && remainingGap > 0) {
          withdrawal403b = Math.min(bal403b, remainingGap);
          bal403b -= withdrawal403b;
          remainingGap -= withdrawal403b;
        }

        // If savings and 403b are depleted, withdraw from Roth
        if (remainingGap > 0) {
          withdrawalRoth = Math.min(balRoth, remainingGap);
          balRoth -= withdrawalRoth;
        }

        // Discretionary Roth Extra Withdrawal
        const rothExtraMonthly = config.rothExtraWithdrawal / 12;
        if (balRoth >= rothExtraMonthly) {
          balRoth -= rothExtraMonthly;
          withdrawalRoth += rothExtraMonthly;
        } else if (balRoth > 0) {
          withdrawalRoth += balRoth;
          balRoth = 0;
        }

        // RMD: in the last month, take whatever the year's conversions and withdrawals haven't
        // already covered. It's taxable, can't go to the Roth, and lands in taxable savings.
        // Like conversion tax, the tax it adds is paid out of the withdrawal itself.
        distributed403b += conversionToRoth + conversionTaxFrom403b + withdrawal403b;
        let rmdTaxes = 0;
        if (month === 11 && rmdRequired > distributed403b && bal403b > 0) {
          rmdWithdrawal = Math.min(bal403b, rmdRequired - distributed403b);
          rmdTaxes = config.taxFromBrackets
            ? Math.min(annualRmdTax, rmdWithdrawal)
            : rmdWithdrawal * config.effectiveTaxRate;
          bal403b -= rmdWithdrawal;
          balCash += rmdWithdrawal - rmdTaxes;
        }

        ordinaryBase += pension + spousePension + spouseGrossPay + jobPay + withdrawal403b;
        conversionIncome += conversionToRoth;
        rmdIncome += rmdWithdrawal;
        socialSecurity += spouseSS + yourSS;

        months.push({
          age: currentAge,
          yearIndex: year,
          monthIndex: month,
          pension,
          spousePension,
          spouseSalary,
          jobPay,
          spouseSS,
          yourSS,
          spouseSSHeld,
          yourSSHeld,
          totalIncome,
          essentialSpending,
          discretionarySpending,
          debtPayments,
          insurance,
          medicare,
          onMedicare: medicareCount,
          incomeTaxes,
          payrollTaxes,
          conversionTaxes,
          rmdTaxes,
          taxes: incomeTaxes + payrollTaxes + conversionTaxes + rmdTaxes,
          totalExpenses,
          netIncome,
          gap,
          withdrawal403b,
          withdrawalCash,
          withdrawalRoth,
          conversionToRoth,
          rmdWithdrawal,
          balance403b: bal403b,
          balanceCash: balCash,
          balanceRoth: balRoth
        });
      }

      return { months, bal403b, balCash, balRoth, ordinaryBase, conversionIncome, rmdIncome, socialSecurity };
    };

    const taxOn = (ordinaryIncome: number, socialSecurity: number) =>
      incomeTax({ ordinaryIncome, socialSecurity, seniors, taxYear, indexing: config.spendingInflation, filing }).total;

    let annualIncomeTax = 0;
    let annualConversionTax = 0;
    let annualRmdTax = 0;
    let run = simulateYear(annualIncomeTax, annualConversionTax, annualRmdTax);
    if (config.taxFromBrackets) {
      for (let pass = 0; pass < 25; pass++) {
        // Layered: base income tax, then the extra conversions add, then the extra the RMD top-up adds
        const base = taxOn(run.ordinaryBase, run.socialSecurity);
        const withConversions = taxOn(run.ordinaryBase + run.conversionIncome, run.socialSecurity);
        const withRmd = taxOn(run.ordinaryBase + run.conversionIncome + run.rmdIncome, run.socialSecurity);
        const wageTax = yearWages > 0 ? base - taxOn(run.ordinaryBase - yearWages, run.socialSecurity) : 0;
        const settled = Math.abs(base - annualIncomeTax) < 1
          && Math.abs(wageTax - annualWageTax) < 1
          && Math.abs(withConversions - base - annualConversionTax) < 1
          && Math.abs(withRmd - withConversions - annualRmdTax) < 1;
        annualIncomeTax = base;
        annualWageTax = wageTax;
        annualConversionTax = withConversions - base;
        annualRmdTax = withRmd - withConversions;
        run = simulateYear(annualIncomeTax, annualConversionTax, annualRmdTax);
        if (settled) break;
      }
    }

    current403b = run.bal403b;
    currentCash = run.balCash;
    currentRoth = run.balRoth;
    yearObj.rmdRequired = rmdRequired;

    for (const m of run.months) {
      if (year403bDepleted === null && m.balance403b === 0 && m.withdrawal403b > 0) {
        year403bDepleted = currentAge;
      }
      if (m.balanceRoth > peakRothBalance) {
        peakRothBalance = m.balanceRoth;
      }
      if (currentAge === 85 && m.monthIndex === 11) {
        rothBalanceAt85 = m.balanceRoth;
      }

      lifetimePension += m.pension;
      lifetimeSS += (m.spouseSS + m.yourSS);
      total403bWithdrawn += m.withdrawal403b;
      totalRothWithdrawn += m.withdrawalRoth;

      if (year === 0) {
         year1TotalWithdrawals += (m.withdrawal403b + m.withdrawalRoth);
      }

      if (m.gap > 0) {
         if (year >= 0 && year <= 2) bucketIncome += m.gap;
         else if (year >= 3 && year <= 5) bucketConservative += m.gap;
         else if (year >= 6 && year <= 8) bucketModerate += m.gap;
      }

      yearObj.months.push(m);

      yearObj.totalPension += m.pension;
      yearObj.totalSpousePension += m.spousePension;
      yearObj.totalSpouseSalary += m.spouseSalary;
      yearObj.totalJobPay += m.jobPay;
      yearObj.totalSSHeldBack += m.spouseSSHeld + m.yourSSHeld;
      yearObj.totalSpouseSS += m.spouseSS;
      yearObj.totalYourSS += m.yourSS;
      yearObj.totalIncome += m.totalIncome;
      yearObj.totalEssentialSpending += m.essentialSpending;
      yearObj.totalDiscretionarySpending += m.discretionarySpending;
      yearObj.totalDebtPayments += m.debtPayments;
      yearObj.totalInsurance += m.insurance;
      yearObj.totalMedicare += m.medicare;
      yearObj.totalIncomeTaxes += m.incomeTaxes;
      yearObj.totalPayrollTaxes += m.payrollTaxes;
      yearObj.totalConversionTaxes += m.conversionTaxes;
      yearObj.totalTaxes += m.taxes;
      yearObj.totalExpenses += m.totalExpenses;
      yearObj.totalNetIncome += m.netIncome;
      yearObj.totalGap += m.gap;
      yearObj.totalWithdrawal403b += m.withdrawal403b;
      yearObj.totalWithdrawalCash += m.withdrawalCash;
      yearObj.totalWithdrawalRoth += m.withdrawalRoth;
      yearObj.totalConversionToRoth += m.conversionToRoth;
      yearObj.totalRmdWithdrawal += m.rmdWithdrawal;
      yearObj.totalRmdTaxes += m.rmdTaxes;
    }

    yearObj.endBalance403b = current403b;
    yearObj.endBalanceCash = currentCash;
    yearObj.endBalanceRoth = currentRoth;

    // --- Auto-generate notes for this year ---
    const notes: string[] = [];
    if (year === 0) notes.push('🎉 Retirement begins');
    if (yearObj.totalSpouseSalary > 0) notes.push(`💼 ${partner} still working`);
    if (yearObj.totalJobPay > 0) notes.push(`💼 ${you} working: ${formatNote(config.jobPay)}/mo gross`);
    if (yearObj.totalSSHeldBack > 0) notes.push(`✂️ SS earnings test holds back ${formatNote(yearObj.totalSSHeldBack)} (credited back after full retirement age)`);

    const prevYear = yearlyData[yearlyData.length - 1];

    // Start events within the year (spouse pension, each Social Security check)
    const startedThisYear = (get: (m: MonthlyData) => number) => yearObj.months.some((m, i) => {
      const before = i > 0 ? yearObj.months[i - 1] : prevYear?.months[11];
      return get(m) > 0 && (before === undefined || get(before) === 0);
    });
    if (startedThisYear(m => m.spousePension)) notes.push(`✅ ${partner}'s pension begins (+${formatNote(config.spousePension)}/mo)`);
    if (startedThisYear(m => m.spouseSS + m.spouseSSHeld)) notes.push(`✅ ${partner}'s Social Security begins at ${config.spouseSSStartAge}`);
    if (startedThisYear(m => m.yourSS + m.yourSSHeld)) notes.push(`✅ ${you}'s Social Security begins at ${config.yourSSStartAge}`);

    // Healthcare transitions within the year (Medicare enrollment, premium vs. employer contribution)
    yearObj.months.forEach((m, i) => {
      const before = i > 0 ? yearObj.months[i - 1] : prevYear?.months[11];
      if (before && m.onMedicare > before.onMedicare) {
        const who = !spouse ? `${you} on Medicare` : m.onMedicare === 2 ? 'Both on Medicare' : 'First of you on Medicare';
        notes.push(`🏥 ${who}: premium + Part B now ${formatNote(m.insurance + m.medicare)}/mo`);
      }
      if (before && before.insurance === 0 && m.insurance > 0 && before.onMedicare === m.onMedicare) {
        notes.push("💊 Premium passes the employer's contribution");
      }
    });

    // Loan payoffs: a debt whose final payment falls in this projection year
    config.debts.forEach((d, i) => {
      const yearStart = retirementMonthIndex + 1 + year * 12;
      if (debtEnds[i] >= yearStart && debtEnds[i] < yearStart + 12) {
        notes.push(`🏁 ${d.name} paid off (−${formatNote(d.payment)}/mo)`);
      }
    });

    // 403b events
    if (yearObj.totalConversionToRoth > 0) {
      notes.push(`🔄 Roth conversion: ${formatNote(yearObj.totalConversionToRoth/12)}/mo`);
    }
    if (yearObj.totalWithdrawal403b > 0) {
      notes.push(`📤 Gap covered by 403b: ${formatNote(yearObj.totalWithdrawal403b/12)}/mo avg`);
    }
    if (yearObj.totalWithdrawalRoth > 0) {
      notes.push(`📤 Gap covered by Roth: ${formatNote(yearObj.totalWithdrawalRoth/12)}/mo avg`);
    }
    if (year403bDepleted === currentAge && yearObj.endBalance403b === 0) {
      notes.push('⚠️ 403b fully depleted; the Roth is primary');
    }
    if (yearObj.rmdRequired > 0) {
      if (prevYear === undefined || prevYear.rmdRequired === 0) notes.push(`📋 RMDs begin (${you} turns ${rmdAge})`);
      notes.push(yearObj.totalRmdWithdrawal > 0
        ? `📋 RMD ${formatNote(yearObj.rmdRequired)} · ${formatNote(yearObj.totalRmdWithdrawal - yearObj.totalRmdTaxes)} to savings after ${formatNote(yearObj.totalRmdTaxes)} tax`
        : `📋 RMD ${formatNote(yearObj.rmdRequired)} · already covered`);
    }
    if (yearObj.totalWithdrawalCash > 0) {
      notes.push(`💵 Gap covered by savings: ${formatNote(yearObj.totalWithdrawalCash/12)}/mo avg`);
    }

    yearObj.notes = notes;

    yearlyData.push(yearObj);
  }

  const safeWithdrawalRate = year1StartingAssets > 0 ? (year1TotalWithdrawals / year1StartingAssets) * 100 : 0;

  return {
    yearly: yearlyData,
    metrics: {
      year403bDepleted,
      peakRothBalance,
      rothBalanceAt85,
      lifetimePension,
      lifetimeSS,
      total403bWithdrawn,
      totalRothWithdrawn,
      safeWithdrawalRate,
      bucketIncome,
      bucketConservative,
      bucketModerate
    }
  };
}
