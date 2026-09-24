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

// Plan files: round trip, old/partial files, junk
ok(JSON.stringify(toConfig({ format: 'calpers-retirement-planner', version: 1, plan: S })) === JSON.stringify(S), 'file round trip');
const partial = toConfig({ yourBirthDate: '1970-01-01', yourRetirementDate: '2031-01-01', current403b: 'oops', debts: [{ name: 'X', payment: '100', endDate: '2033-01-01' }], pensionFormulaId: 'nope' });
ok(partial && partial.current403b === S.current403b && partial.debts[0].payment === 100 && partial.pensionFormulaId === S.pensionFormulaId, 'partial file falls back safely');
ok(toConfig({ hello: 1 }) === null && toConfig('x') === null, 'junk rejected');
// Edge: retire past end age, no crash
ok(run({ projectionEndAge: 60 }).yearly.length === 1, 'end age before retirement gives one year');
console.log(fails ? `${fails} FAILURES` : 'ALL PASS');
process.exitCode = fails ? 1 : 0;
await v.close();
