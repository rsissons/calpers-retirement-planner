// Model checks: tax math against hand calculations, every CalPERS formula, caps and minimum ages,
// single vs. joint households, and plan-file loading. Run with `npm test`.
import { createServer } from 'vite';
const v = await createServer({ root: process.cwd(), configFile: false, server:{middlewareMode:true, hmr:false}, logLevel:'error' });
const { sampleConfig: S } = await v.ssrLoadModule('/src/config.ts');
const { calculateProjection: P } = await v.ssrLoadModule('/src/projection.ts');
const { prepareConfig, toConfig } = await v.ssrLoadModule('/src/model.ts');
const { calculatePension, rmdStartAge } = await v.ssrLoadModule('/src/calpers.ts');
const { incomeTax } = await v.ssrLoadModule('/src/tax.ts');
const { FORMULAS } = await v.ssrLoadModule('/src/formulas.ts');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const tot = y => y.endBalance403b + y.endBalanceCash + y.endBalanceRoth;
const run = over => P(prepareConfig({ ...S, ...over }));

// Tax: hand-computed federal single 2026 on $60K, no SS: (60000-16100)=43900 → 1240 + 31500*.12 = 5020
const t = incomeTax({ ordinaryIncome: 60000, socialSecurity: 0, seniors: 0, taxYear: 2026, indexing: 0, filing: 'single' });
ok(Math.abs(t.federal - 5020) < 0.01, `single federal on $60K = ${t.federal}`);
// CA 2025 single on $60K: taxable 54294 → 1022.01 + (54294-41452)*.06 = 1792.53, minus $153 credit = 1639.53
const c = incomeTax({ ordinaryIncome: 60000, socialSecurity: 0, seniors: 0, taxYear: 2025, indexing: 0, filing: 'single' });
ok(Math.abs(c.california - 1639.53) < 0.05, `single CA 2025 on $60K = ${c.california.toFixed(2)}`);
const j = incomeTax({ ordinaryIncome: 120000, socialSecurity: 0, seniors: 0, taxYear: 2026, indexing: 0, filing: 'joint' });
ok(Math.abs(j.federal - (2480 + (87800 - 24800) * .12)) < 0.01, `joint federal on $120K = ${j.federal}`);

// Sample runs to 95 and doesn't crash
const base = run({});
ok(base.yearly.at(-1).age === 95 && base.yearly[0].age === 62, `sample runs ${base.yearly[0].age}–${base.yearly.at(-1).age}`);
console.log('     sample: pension', Math.round(prepareConfig(S).pensionStart), 'end assets', Math.round(tot(base.yearly.at(-1))));

// Single: no spouse income, fewer seniors, single brackets → different taxes; spouse fields ignored
const single = run({ hasSpouse: false });
ok(single.yearly.every(y => y.totalSpouseSalary === 0 && y.totalSpouseSS === 0 && y.totalSpousePension === 0), 'single: no spouse income');
ok(single.yearly.every(y => y.months.every(m => m.onMedicare <= 1)), 'single: at most one on Medicare');
// Spouse pension adds income from their retirement and is taxed
const sp = run({ spousePension: 2000 });
const spy = sp.yearly.find(y => y.totalSpousePension > 0);
ok(spy && sp.yearly.reduce((a, y) => a + y.totalTaxes, 0) > base.yearly.reduce((a, y) => a + y.totalTaxes, 0), `spouse pension starts at age ${spy?.age} and raises taxes`);
ok(spy.notes.some(n => n.includes('pension begins')), 'spouse pension note');

// Formulas: every one computes a sane pension at 60 with 25 yrs and $10K
for (const f of FORMULAS) {
  const p = calculatePension({ ...S, pensionFormulaId: f.id, yourBirthDate: '1970-01-01', yourRetirementDate: '2030-01-01', serviceCreditYears: 25, serviceCreditAsOf: '2030-01-01', finalCompensation: 10000, beneficiaryOptionFactor: 1 });
  if (!(p.eligible && p.unmodified > 1000 && p.unmodified <= 10000 * (f.maxPercent ?? 1))) { fails++; console.log('FAIL formula', f.id, p.unmodified); }
}
console.log('ok   all', FORMULAS.length, 'formulas compute at age 60');
// Safety cap: 3% at 50 with 35 years = 105% → capped at 90%
const cap = calculatePension({ ...S, pensionFormulaId: 'local-safety-3-at-50', yourBirthDate: '1975-01-01', yourRetirementDate: '2030-06-01', serviceCreditYears: 35, serviceCreditAsOf: '2030-06-01', finalCompensation: 10000 });
ok(cap.capped && Math.abs(cap.benefitPercent - 0.9) < 1e-9, `safety 3%@50 capped at ${cap.benefitPercent}`);
// PEPRA 2%@62 under 52 is ineligible
const pe = calculatePension({ ...S, pensionFormulaId: 'school-2-at-62', yourBirthDate: '1979-01-01', yourRetirementDate: '2030-06-01' });
ok(!pe.eligible && pe.unmodified === 0, `PEPRA at age ${pe.ageYears} is ineligible`);
const pe2 = calculatePension({ ...S, pensionFormulaId: 'school-2-at-62', yourBirthDate: '1965-03-01', yourRetirementDate: '2032-03-01' });
ok(Math.abs(pe2.ageFactor - 0.025) < 1e-9, `PEPRA at 67 factor ${pe2.ageFactor}`);
// RMD ages
ok(rmdStartAge('1960-01-01') === 75 && rmdStartAge('1955-06-01') === 73, 'RMD start ages');

// CalSTRS: monthly factors at the age on the last day of the retirement month, career factor, early retirement
const strs = (id, birth, retire, years, over = {}) => calculatePension({ ...S, pensionFormulaId: id, yourBirthDate: birth, yourRetirementDate: retire, serviceCreditYears: years, serviceCreditAsOf: retire, finalCompensation: 10000, beneficiaryOptionFactor: 1, ...over });
const near = (a, b) => Math.abs(a - b) < 1e-9;
ok(FORMULAS.filter(f => f.category === 'CalSTRS').every(f => f.table.every(r => r.factors.length === 12)), 'CalSTRS tables have 12 monthly columns');
ok(near(strs('calstrs-2-at-60', '1970-01-15', '2029-06-10', 25).ageFactor, 0.0193), '2% at 60, age 59y5m = 1.930%');
const eom = strs('calstrs-2-at-60', '1970-06-20', '2030-06-05', 25);
ok(eom.ageYears === 60 && eom.ageMonths === 0 && near(eom.ageFactor, 0.02), 'CalSTRS age is taken at the end of the month (59y11m on the 5th → 60y0m)');
ok(near(strs('calstrs-2-at-62', '1966-01-01', '2030-10-01', 25).ageFactor, 0.02367), '2% at 62, age 64y9m = 2.367%');
ok(near(strs('calstrs-2-at-62', '1970-01-01', '2070-01-01', 25).ageFactor, 0.024), '2% at 62, past 65 = 2.4% max');
ok(!strs('calstrs-2-at-62', '1975-12-15', '2030-11-10', 25).eligible, '2% at 62 under 55 is ineligible');
ok(!strs('calstrs-2-at-60', '1978-01-01', '2030-01-10', 25).eligible, '2% at 60 at 52 with 25 years is ineligible');
const early = strs('calstrs-2-at-60', '1978-01-01', '2030-01-10', 30);
ok(early.eligible && near(early.ageFactor, 0.0142), `2% at 60 at 52 with 30 years: 1.22% + 0.2% career = ${(early.ageFactor * 100).toFixed(3)}%`);
ok(near(strs('calstrs-2-at-60', '1969-01-01', '2030-04-10', 30).ageFactor, 0.02367), 'career factor: 61y3m with 30 years = 2.367%');
ok(near(strs('calstrs-2-at-60', '1969-01-01', '2030-07-10', 30).ageFactor, 0.024), 'career factor: 61y6m with 30 years caps at 2.4%');
ok(near(strs('calstrs-2-at-60', '1969-01-01', '2030-04-10', 29.9).ageFactor, 0.02167), 'no career factor under 30 years');
// CalSTRS COLA: simple 2% of the starting benefit, first on the Sept 1 after the first anniversary
const sc = run({ hasSpouse: false, pensionFormulaId: 'calstrs-2-at-60', yourRetirementDate: '2030-06-30' });
const scm = sc.yearly.flatMap(y => y.months);
const p0 = scm[0].pension; // Jul 2030
const at2 = (y, m) => scm[(y - 2030) * 12 + (m - 7)].pension;
ok(near(at2(2031, 8), p0) && near(at2(2031, 9), p0 * 1.02) && near(at2(2032, 9), p0 * 1.04) && near(at2(2040, 9), p0 * 1.2), 'CalSTRS COLA: +2% of the start each Sept 1 from 2031, not compounded');
const sc2 = run({ hasSpouse: false, pensionFormulaId: 'calstrs-2-at-60', yourRetirementDate: '2030-09-30' }).yearly.flatMap(y => y.months);
ok(near(sc2[11].pension, sc2[0].pension) && near(sc2[23].pension, sc2[0].pension * 1.02), 'retiring on or after Sept 1: first COLA the Sept 1 two years on');
// CalSTRS work rules: pay in the 180-day window comes off the pension; after it, pay over the fiscal-year
// limit ($59,565 for 2026-27, indexed) is withheld until collected
const wk = run({ hasSpouse: false, pensionFormulaId: 'calstrs-2-at-60', yourRetirementDate: '2030-06-30', jobPay: 8000, jobEndAge: 70, jobAtPensionEmployer: true });
const wm = wk.yearly.flatMap(y => y.months);
const gross = m => m.pension + m.pensionHeld;
ok(wm.slice(0, 6).every(m => near(m.pensionHeld, Math.min(gross(m), 8000))) && wm[6].pensionHeld === 0, '180-day window (Jul–Dec 2030): pay comes off the pension');
ok(wm.slice(6, 12).every(m => m.pensionHeld === 0), 'FY 2030-31 after the window: $48K under the limit, nothing held');
// FY 2031-32 on: $96K a year; the limit is passed in the 9th month (Mar 2032: $72K > $65,764), and every
// fiscal year's excess is collected in full from later checks, even past June
const fyExcess = fy => Math.max(0, 96000 - 59565 * 1.02 ** (fy - 2026));
const heldAfter = wm.slice(6).reduce((a, m) => a + m.pensionHeld, 0);
const owedAll = [2031, 2032, 2033, 2034, 2035, 2036, 2037].reduce((a, fy) => a + fyExcess(fy), 0); // job ends Jun 2038 (age 70)
ok(wm.slice(12, 20).every(m => m.pensionHeld === 0) && wm[20].pensionHeld > 0, 'FY 2031-32: withholding starts in Mar 2032, when pay passes the limit');
ok(Math.abs(heldAfter - owedAll) < 0.01, `excess over the limit collected in full: ${heldAfter.toFixed(2)} = ${owedAll.toFixed(2)}`);
ok(wm.every(m => m.pension >= -1e-9), 'never holds back more than the pension');
const off = run({ hasSpouse: false, pensionFormulaId: 'calstrs-2-at-60', yourRetirementDate: '2030-06-30', jobPay: 8000, jobEndAge: 70 });
ok(off.yearly.every(y => y.totalPensionHeld === 0), 'job outside CA public schools: pension untouched');
const perJob = run({ hasSpouse: false, yourRetirementDate: '2030-06-30', jobPay: 8000, jobEndAge: 70, jobAtPensionEmployer: true }).yearly.flatMap(y => y.months);
ok(perJob.slice(0, 6).every(m => m.jobPay === 0) && perJob[6].jobPay === 8000 && perJob.every(m => m.pensionHeld === 0), 'CalPERS retired annuitant: job starts after the 180-day wait, pension untouched');
// Plan files: round trip, old/partial files, junk
ok(JSON.stringify(toConfig({ format: 'calpers-retirement-planner', version: 1, plan: S })) === JSON.stringify(S), 'file round trip');
const partial = toConfig({ yourBirthDate: '1970-01-01', yourRetirementDate: '2031-01-01', current403b: 'oops', debts: [{ name: 'X', payment: '100', endDate: '2033-01-01' }], pensionFormulaId: 'nope' });
ok(partial && partial.current403b === S.current403b && partial.debts[0].payment === 100 && partial.pensionFormulaId === S.pensionFormulaId, 'partial file falls back safely');
ok(toConfig({ hello: 1 }) === null && toConfig('x') === null, 'junk rejected');
// Work after retirement: payroll tax, the SS wage base, extra Medicare, and the earnings test
const { fullRetirementAge } = await v.ssrLoadModule('/src/tax.ts');
ok(fullRetirementAge('1960-05-01') === 67 && fullRetirementAge('1954-05-01') === 66 && Math.abs(fullRetirementAge('1957-05-01') - 66.5) < 1e-9, 'full retirement ages');
const job = run({ hasSpouse: false, jobPay: 3000, jobEndAge: 64 });
ok(Math.abs(job.yearly[0].months[0].payrollTaxes - 268.5) < 0.005, `$3,000 job: payroll ${job.yearly[0].months[0].payrollTaxes} = 3000 × 8.95%`);
ok(job.yearly.find(y => y.age === 64).totalJobPay === 0 && job.yearly.find(y => y.age === 63).totalJobPay > 0, 'job stops at jobEndAge');
ok(job.yearly.reduce((a, y) => a + y.totalIncomeTaxes, 0) > single.yearly.reduce((a, y) => a + y.totalIncomeTaxes, 0), 'job pay raises income tax');
// Big job, single: wage base $184,500 × 1.02^(tax year − 2026), 0.9% over $200K
const big = run({ hasSpouse: false, jobPay: 20000, jobEndAge: 70 });
const bigY = big.yearly[1];
const tyBig = 2032; // Plan year 2 runs Jul 2031–Jun 2032; its tax year is the calendar year of its 8th month
const baseBig = 184500 * 1.02 ** (tyBig - 2026);
const expBig = 0.062 * baseBig + 0.0275 * 240000 + 0.009 * 40000;
ok(Math.abs(bigY.totalPayrollTaxes - expBig) < 0.01, `$20K job: year payroll ${bigY.totalPayrollTaxes.toFixed(2)} = ${expBig.toFixed(2)}`);
// Earnings test: SS at 62 while working $3,000/mo before FRA 67 → (36,000 − limit) / 2 held back
const et = run({ hasSpouse: false, jobPay: 3000, jobEndAge: 70, yourSSStartAge: 62 });
const etY = et.yearly[1];
const expHeld = (36000 - 24480 * 1.02 ** (tyBig - 2026)) / 2;
ok(Math.abs(etY.totalSSHeldBack - expHeld) < 0.01, `earnings test holds back ${etY.totalSSHeldBack.toFixed(2)} = ${expHeld.toFixed(2)}`);
ok(Math.abs(etY.totalYourSS + etY.totalSSHeldBack - et.yearly[1].months[0].yourSS * 12 - et.yearly[1].months[0].yourSSHeld * 12) < 0.01, 'held back + paid = full benefit');
ok(et.yearly.filter(y => y.age >= 67).every(y => y.totalSSHeldBack === 0), 'no earnings test from full retirement age');
ok(run({ hasSpouse: false, jobPay: 2000, jobEndAge: 70, yourSSStartAge: 62 }).yearly[1].totalSSHeldBack === 0, 'no holdback under the limit');
// Grace year: spouse draws SS from 62 while working, retires at 63. In the year they stop, months not
// worked get the full check; the year before, the whole-year rule applies to every SS month.
const gy = run({ spouseSSStartAge: 62 });
const gyMonths = gy.yearly.flatMap(y => y.months);
const retiredIdx = gyMonths.findIndex(m => m.spouseSalary === 0);
const gyYear = gy.yearly[gyMonths[retiredIdx].yearIndex];
ok(gyYear.months.every(m => m.spouseSalary > 0 || m.spouseSSHeld === 0), 'grace year: no holdback once they stop working');
ok(gyMonths.slice(0, retiredIdx).some(m => m.spouseSSHeld > 0), 'while working before FRA: SS held back');
ok(gy.yearly.slice(gyYear.yearIndex + 1).every(y => y.totalSSHeldBack === 0), 'after the grace year: nothing held');
// Older plans: spouse pay was take-home; it loads as take-home and isn't taxed
const old = toConfig({ ...S, spousePayIsGross: undefined });
ok(old.spousePayIsGross === false, 'pre-1.2 plan loads as take-home');
const oldRun = P(prepareConfig(old));
ok(oldRun.yearly.every(y => y.totalPayrollTaxes === 0), 'take-home spouse pay: no payroll tax');
ok(base.yearly[0].totalPayrollTaxes > 0 && oldRun.yearly[0].totalIncomeTaxes < base.yearly[0].totalIncomeTaxes, 'gross spouse pay: payroll and income tax');
// Budget card: each year's rows (income − income tax − payroll tax − health − spending − loans) add up to the surplus
const rowsSum = y => y.totalIncome - y.totalIncomeTaxes - y.totalPayrollTaxes - y.totalInsurance - y.totalMedicare - y.totalEssentialSpending - y.totalDiscretionarySpending - y.totalDebtPayments;
ok([base, single, sp, job, big, et, oldRun].every(r => r.yearly.every(y => Math.abs(rowsSum(y) + y.totalGap) < 0.01)), "budget rows add up to each year's surplus");
// Edge: retire past end age, no crash
ok(run({ projectionEndAge: 60 }).yearly.length === 1, 'end age before retirement gives one year');
console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
process.exitCode = fails ? 1 : 0;
await v.close();
