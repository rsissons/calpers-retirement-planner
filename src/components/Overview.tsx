import type { FC } from 'react';
import type { ProjectionResult } from '../projection';
import type { Config } from '../config';
import { calculatePension, ageOn, birthdayAt, firstOfMonthAfter, rmdStartAge } from '../calpers';
import { BudgetByYear } from './BudgetByYear';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props { config: Config; projection: ProjectionResult; }

const $ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
const $k = (v: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(v);

function countdown(dateStr: string) {
  const t = new Date(dateStr), n = new Date();
  if (isNaN(t.getTime()) || t < n) return { y: 0, m: 0, d: 0 };
  let y = t.getFullYear() - n.getFullYear();
  let m = t.getMonth() - n.getMonth();
  let d = t.getDate() - n.getDate();
  if (d < 0) { m--; d += new Date(t.getFullYear(), t.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}

const C = { green: '#009E73', orange: '#E69F00', vermillion: '#D55E00', blue: '#0072B2', sky: '#56B4E9', purple: '#CC79A7', navy: '#15325b' };

const KPI: FC<{ label: string; value: string; sub?: string; color?: string }> = ({ label, value, sub, color = C.navy }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
    <p className="text-xl sm:text-2xl font-bold" style={{ color }}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const CountdownBox: FC<{ n: number; label: string; color: string }> = ({ n, label, color }) => (
  <div className="flex flex-col items-center">
    <div className="text-white text-xl font-bold rounded w-12 h-10 flex items-center justify-center" style={{ background: color }}>{n}</div>
    <span className="text-[10px] font-bold text-gray-600 mt-1">{label}</span>
  </div>
);

export const Overview: FC<Props> = ({ config, projection }) => {
  const y1 = projection.yearly[0];
  const m1 = y1.months[0];
  const last = projection.yearly[projection.yearly.length - 1];
  const you = config.yourName || 'You';
  const partner = config.spouseName || 'Spouse';
  const yourCount = countdown(config.yourRetirementDate);
  const spouseCount = countdown(config.spouseRetirementDate);
  const horizon = `${projection.yearly.length}-Year`;

  // Find depletion age
  const assetsAt = (y: { endBalance403b: number; endBalanceCash: number; endBalanceRoth: number }) =>
    y.endBalance403b + y.endBalanceCash + y.endBalanceRoth;
  const depletionYear = projection.yearly.find(y => assetsAt(y) < 1000);
  const fundedThrough = depletionYear ? `Age ${depletionYear.age}` : `Age ${last.age}+`;

  // First-month headline (the budget card below covers any year)
  const monthlyNet = m1.netIncome;
  const monthlySpend = m1.essentialSpending + m1.discretionarySpending + m1.debtPayments;
  const surplus = monthlyNet - monthlySpend;

  // Monthly pension N years in, from the projection (the system's COLA timing), before any work-rule holdback
  const grossPension = (m: { pension: number; pensionHeld: number }) => m.pension + m.pensionHeld;
  const pensionInYear = (n: number) => grossPension(projection.yearly[Math.min(n, projection.yearly.length - 1)].months[0]);
  const pensionAtEnd = grossPension(last.months[11]);
  const pension = calculatePension(config);
  const sys = pension.system;
  const colaText = `+${(config.pensionCOLA * 100).toFixed(0)}% ${sys === 'CalSTRS' ? 'simple COLA' : 'COLA'}`;

  // Total assets
  const startAssets = config.startingCash + config.starting403b + config.startingRoth;
  const endAssets = assetsAt(last);

  // Chart data
  const assetData = projection.yearly.map(y => ({
    age: y.age,
    '403b': Math.round(y.endBalance403b),
    Savings: Math.round(y.endBalanceCash),
    Roth: Math.round(y.endBalanceRoth),
    Total: Math.round(assetsAt(y)),
  }));
  const hasSavings = projection.yearly.some(y => y.endBalanceCash > 0);

  // Tax/Roth allocation
  const taxFreePct = startAssets > 0 ? (config.startingRoth / startAssets * 100).toFixed(0) : '0';
  const taxDefPct = startAssets > 0 ? (config.starting403b / startAssets * 100).toFixed(0) : '0';

  // Key milestones, by your age
  const milestones: { age: number; label: string }[] = [];
  const yourAgeOn = (date: string) => Math.floor(ageOn(config.yourBirthDate, date));
  milestones.push({ age: config.retirementAge, label: `🎉 ${you} retires` });
  if (config.yourSS > 0) milestones.push({ age: config.yourSSStartAge, label: `✅ ${you}'s Social Security begins (+${$(config.yourSS)}/mo)` });
  milestones.push({ age: config.medicareAge, label: `🏥 ${you} on Medicare` });
  if (config.hasSpouse) {
    milestones.push({ age: yourAgeOn(config.spouseRetirementDate), label: `💼 ${partner} retires${config.spousePension > 0 ? ` + pension begins (+${$(config.spousePension)}/mo)` : ''}` });
    if (config.spouseSS > 0) milestones.push({ age: yourAgeOn(birthdayAt(config.spouseBirthDate, config.spouseSSStartAge)), label: `✅ ${partner}'s Social Security begins (+${$(config.spouseSS)}/mo at ${config.spouseSSStartAge})` });
    milestones.push({ age: yourAgeOn(birthdayAt(config.spouseBirthDate, config.medicareAge)), label: `🏥 ${partner} on Medicare` });
  }
  milestones.push({ age: rmdStartAge(config.yourBirthDate), label: '📋 RMDs required on the 403(b)' });
  if (projection.metrics.year403bDepleted) milestones.push({ age: projection.metrics.year403bDepleted, label: '⚠️ 403(b) fully converted/depleted' });
  milestones.sort((a, b) => a.age - b.age);

  // Life timeline: years lived at retirement, then the planned years, out of the plan's full span
  const people = [
    { name: you, retAge: config.retirementAge, endAge: last.age },
    ...(config.hasSpouse ? [{
      name: partner,
      retAge: Math.floor(ageOn(config.spouseBirthDate, config.yourRetirementDate)),
      endAge: Math.floor(ageOn(config.spouseBirthDate, firstOfMonthAfter(config.yourRetirementDate, projection.yearly.length * 12))),
    }] : []),
  ];
  const span = Math.max(...people.map(p => p.endAge));

  const firstRmd = projection.yearly.find(y => y.rmdRequired > 0)?.rmdRequired ?? 0;

  return (
    <div className="p-0 sm:p-2 space-y-5 max-w-7xl mx-auto">

      {/* ── TOP KPI ROW ── */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Net Income, First Month" value={$(monthlyNet)} sub={`${surplus >= 0 ? '+' : ''}${$(surplus)} vs. expenses`} color={surplus >= 0 ? C.green : C.vermillion} />
        <KPI label={`${sys} Pension (Start)`} value={$(config.pensionStart) + '/mo'} sub={`${colaText} · ${$(pensionAtEnd)}/mo at age ${last.age}`} color={C.blue} />
        <KPI label="Liquid Assets at Retirement" value={$k(startAssets)} sub={`Savings: ${$k(config.startingCash)} · 403b: ${$k(config.starting403b)} · Roth: ${$k(config.startingRoth)}`} color={C.navy} />
        <KPI label="Projected Funded Through" value={fundedThrough} sub={endAssets > 10000 ? `${$k(endAssets)} remaining at age ${last.age}` : 'Assets run out. Review the plan.'} color={endAssets > 10000 ? C.green : C.vermillion} />
      </div>

      {/* ── ROW 2: Countdown + pension ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Retirement Countdown */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-base font-bold text-[#15325b] mb-4">🗓 Retirement Target</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-28 text-sm font-semibold text-gray-700">{you}<br/><span className="text-xs font-normal text-gray-400">{config.yourRetirementDate}</span></span>
              <div className="flex gap-2">{[{ n: yourCount.y, l: 'YRS' }, { n: yourCount.m, l: 'MOS' }, { n: yourCount.d, l: 'DAYS' }].map(x => <CountdownBox key={x.l} n={x.n} label={x.l} color={C.navy} />)}</div>
            </div>
            {config.hasSpouse && (
              <div className="flex items-center gap-4">
                <span className="w-28 text-sm font-semibold text-gray-700">{partner}<br/><span className="text-xs font-normal text-gray-400">{config.spouseRetirementDate}</span></span>
                <div className="flex gap-2">{[{ n: spouseCount.y, l: 'YRS' }, { n: spouseCount.m, l: 'MOS' }, { n: spouseCount.d, l: 'DAYS' }].map(x => <CountdownBox key={x.l} n={x.n} label={x.l} color="#6b7280" />)}</div>
              </div>
            )}
          </div>
          {/* Life timeline bars */}
          <div className="mt-5 space-y-2">
            {people.map(p => {
              const pct = (n: number) => `${((n / span) * 100).toFixed(1)}%`;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span className="font-semibold">{p.name}</span><span>Age {p.retAge} at {you === p.name ? 'retirement' : `${you}'s retirement`} · plan runs to {p.endAge}</span>
                  </div>
                  <div className="h-4 flex w-full rounded overflow-hidden text-[10px] font-bold text-white">
                    <div style={{ width: pct(p.retAge), background: C.navy }} title={`Age at ${you}'s retirement: ${p.retAge}`} className="flex items-center justify-center truncate">Lived</div>
                    <div style={{ width: pct(p.endAge - p.retAge), background: C.sky }} title={`Years in the plan: ${p.endAge - p.retAge}`} className="flex items-center justify-center truncate">Retirement</div>
                    <div style={{ flex: 1, background: '#e5e7eb' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pension panel */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-base font-bold text-[#15325b] mb-1">🏛 {sys} Pension</h3>
          <p className="text-xs text-gray-400 mb-4">
            {config.pensionFromFormula
              ? `${pension.formula.category === 'CalSTRS' ? 'CalSTRS' : pension.formula.category} ${pension.formula.name} · ${(pension.ageFactor * 100).toFixed(3)}% × ${pension.serviceYears.toFixed(2)} yrs × ${$(config.finalCompensation)} · option factor ${(config.beneficiaryOptionFactor * 100).toFixed(1)}% · age ${pension.ageYears}y ${pension.ageMonths}m`
              : `Retire age ${config.retirementAge} · amount entered by hand`}
          </p>
          {config.pensionFromFormula && !pension.eligible && (
            <p className="text-sm font-semibold mb-3" style={{ color: C.vermillion }}>Under the minimum retirement age for this formula, so the pension is $0.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Starting Monthly Pension', value: $(config.pensionStart), color: C.blue },
              { label: sys === 'CalSTRS' ? 'Annual COLA (simple)' : 'Annual COLA Rate', value: `${(config.pensionCOLA * 100).toFixed(0)}%/yr`, color: C.green },
              { label: 'Monthly at Age ' + (config.retirementAge + 10), value: $(pensionInYear(10)), color: C.blue },
              { label: 'Monthly at Age ' + (config.retirementAge + 20), value: $(pensionInYear(20)), color: C.blue },
              { label: `Lifetime Total (to Age ${last.age})`, value: $k(projection.metrics.lifetimePension), color: C.green },
              { label: `First RMD (Age ${rmdStartAge(config.yourBirthDate)})`, value: firstRmd > 0 ? $(firstRmd) + '/yr' : 'None (403b empty)', color: firstRmd > 0 ? C.orange : C.green },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Monthly Budget + Asset Projection ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <BudgetByYear config={config} projection={projection} />

        {/* Asset Projection */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-base font-bold text-[#15325b] mb-1">📈 Liquid Asset Projection</h3>
          <p className="text-xs text-gray-400 mb-3">{horizon} trajectory of savings, 403(b) + Roth to age {last.age} at {(config.annualReturn * 100).toFixed(1)}% return</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assetData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="g403b" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.sky} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={C.sky} stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="gRoth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.green} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={$k} width={40} />
                <Tooltip formatter={(v) => [$(Number(v))]} labelFormatter={l => `Age ${l}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="403b" stackId="1" stroke={C.sky} fill="url(#g403b)" name="403(b)" />
                {hasSavings && <Area type="monotone" dataKey="Savings" stackId="1" stroke={C.orange} fill={C.orange} fillOpacity={0.25} name="Savings" />}
                <Area type="monotone" dataKey="Roth" stackId="1" stroke={C.green} fill="url(#gRoth)" name="Roth" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── ROW 4: Milestones + Tax Allocation + Account Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Key Milestones */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-[#15325b] mb-1 flex items-center gap-2">
            <span>📅</span> Key Milestones
          </h3>
          <p className="text-xs text-gray-400 mb-4">By {you}'s age</p>
          <div className="space-y-4">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="shrink-0 pt-0.5">
                  <span className="inline-block text-[10px] font-bold rounded-full px-2.5 py-1 text-white whitespace-nowrap shadow-sm" style={{ background: C.navy }}>
                    Age {m.age}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Allocation */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-base font-bold text-[#15325b] mb-1">🧾 Account Tax Allocation</h3>
          <p className="text-xs text-gray-400 mb-4">Invested accounts at retirement</p>
          <div className="h-5 flex w-full rounded overflow-hidden mb-3">
            <div style={{ width: `${taxFreePct}%`, background: C.green }} title="Tax-Free Roth" />
            <div style={{ width: `${taxDefPct}%`, background: C.sky }} title="Tax-Deferred 403b" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-sm" style={{ background: C.green, display: 'inline-block' }} /> Tax-Free (Roth)</span>
              <span className="font-bold" style={{ color: C.green }}>{taxFreePct}% · {$k(config.startingRoth)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-sm" style={{ background: C.sky, display: 'inline-block' }} /> Tax-Deferred (403b/457)</span>
              <span className="font-bold" style={{ color: C.sky }}>{taxDefPct}% · {$k(config.starting403b)}</span>
            </div>
            <div className="pt-2 border-t text-xs text-gray-500">
              {config.maxMonthlyConversion > 0
                ? `Converting up to ${$k(config.maxMonthlyConversion * 12)}/yr from the 403(b) to the Roth.`
                : 'No Roth conversions planned.'}
            </div>
          </div>
        </div>

        {/* Full-horizon summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-base font-bold text-[#15325b] mb-1">📊 {horizon} Summary</h3>
          <p className="text-xs text-gray-400 mb-4">Projected totals from age {y1.age} to {last.age}</p>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Lifetime Pension Income', val: projection.metrics.lifetimePension, color: C.blue },
              { label: 'Lifetime Social Security', val: projection.metrics.lifetimeSS, color: C.blue },
              { label: 'Total 403(b) Withdrawn', val: projection.metrics.total403bWithdrawn, color: C.sky },
              { label: 'Total Roth Withdrawn', val: projection.metrics.totalRothWithdrawn, color: C.green },
              { label: 'Peak Roth Balance', val: projection.metrics.peakRothBalance, color: C.green },
              ...(last.age >= 85 ? [{ label: 'Roth Balance at Age 85', val: projection.metrics.rothBalanceAt85, color: C.green }] : []),
              { label: 'Final Assets (Age ' + last.age + ')', val: endAssets, color: endAssets > 50000 ? C.green : C.vermillion },
            ].map(row => (
              <div key={row.label} className="flex justify-between">
                <span className="text-gray-600">{row.label}</span>
                <span className="font-bold" style={{ color: row.color }}>{$k(row.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
