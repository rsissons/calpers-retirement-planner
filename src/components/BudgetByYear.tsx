import { useState } from 'react';
import type { FC } from 'react';
import type { Config } from '../config';
import type { ProjectionResult } from '../projection';
import { firstOfMonthAfter } from '../calpers';
import { formulaById, systemOf } from '../formulas';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props { config: Config; projection: ProjectionResult; }

const $ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
const C = { green: '#009E73', orange: '#E69F00', vermillion: '#D55E00', blue: '#0072B2', sky: '#56B4E9', purple: '#CC79A7' };

// Notes that repeat every year (money flows) are left out of "What changes this year"
const isEvent = (note: string) => !/^(🔄|📤|💵)/.test(note) && !note.startsWith('📋 RMD ');

// The average month of any plan year, picked with a slider. Rows add up to the surplus or shortfall.
export const BudgetByYear: FC<Props> = ({ config, projection }) => {
  const years = projection.yearly;
  const [picked, setPicked] = useState(0);
  const i = Math.min(picked, years.length - 1);
  const y = years[i];
  const you = config.yourName || 'You';
  const partner = config.spouseName || 'Spouse';

  const monthName = (k: number) => {
    const [yy, mm] = firstOfMonthAfter(config.yourRetirementDate, k + 1).split('-').map(Number);
    return new Date(yy, mm - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  const span = `${monthName(i * 12)} – ${monthName(i * 12 + 11)}`;

  // Monthly averages for the year
  const mo = (total: number) => total / 12;
  const net = mo(y.totalNetIncome);
  const spend = mo(y.totalEssentialSpending + y.totalDiscretionarySpending + y.totalDebtPayments);
  const surplus = -mo(y.totalGap);
  const conversionTax = mo(y.totalConversionTaxes + y.totalRmdTaxes);

  const rows = [
    { label: `${systemOf(formulaById(config.pensionFormulaId))} Pension`, val: mo(y.totalPension), color: C.blue },
    { label: `${partner}'s Pension`, val: mo(y.totalSpousePension), color: C.blue },
    { label: `${partner}'s ${config.spousePayIsGross ? 'Pay (gross)' : 'Take-Home Pay'}`, val: mo(y.totalSpouseSalary), color: C.sky },
    { label: `${you}'s Job (gross)`, val: mo(y.totalJobPay), color: C.sky },
    { label: `${partner}'s Social Security`, val: mo(y.totalSpouseSS), color: C.blue },
    { label: `${you}'s Social Security`, val: mo(y.totalYourSS), color: C.blue },
    { label: 'Essential', val: -mo(y.totalEssentialSpending), color: C.orange },
    { label: 'Discretionary', val: -mo(y.totalDiscretionarySpending), color: C.vermillion },
    { label: 'Loans', val: -mo(y.totalDebtPayments), color: C.orange },
    { label: 'Healthcare / Insurance', val: -mo(y.totalInsurance + y.totalMedicare), color: C.purple },
    { label: 'Income Tax', val: -mo(y.totalIncomeTaxes), color: '#6b7280' },
    { label: 'Payroll Tax (FICA, SDI)', val: -mo(y.totalPayrollTaxes), color: '#6b7280' },
  ].filter(r => Math.abs(r.val) > 0.5);

  // How the year's shortfalls were covered, and what savings did
  const shortfall = y.months.reduce((sum, m) => sum + Math.max(0, m.gap), 0);
  const sources = [
    { label: 'Savings', val: y.totalWithdrawalCash },
    { label: '403(b)', val: y.totalWithdrawal403b },
    { label: 'Roth', val: y.totalWithdrawalRoth },
  ].filter(s => s.val > 0.5);
  const savingsStart = i === 0 ? config.startingCash : years[i - 1].endBalanceCash;
  const events = y.notes.filter(isEvent);

  // Plan-wide: when savings stop covering shortfalls
  const allMonths = years.flatMap(yr => yr.months);
  const first403b = allMonths.findIndex(m => m.gap > 0 && m.withdrawal403b > 0);
  const firstRoth = allMonths.findIndex(m => m.gap > 0 && m.withdrawalRoth > 0);

  const step = (d: number) => setPicked(Math.max(0, Math.min(years.length - 1, i + d)));
  const btn = 'p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <h3 className="text-base font-bold text-[#15325b] mb-1">💵 Monthly Budget by Year</h3>
      <p className="text-xs text-gray-400 mb-3">Average month in the year you pick · Income vs. Spending</p>

      {/* Year picker */}
      <div className="rounded bg-gray-50 border border-gray-100 p-3 mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button type="button" onClick={() => step(-1)} disabled={i === 0} aria-label="Previous year" className={btn}><ChevronLeft size={16} /></button>
          <div className="text-center min-w-0">
            <p className="text-sm font-bold text-gray-800">Age {y.age}{i === 0 ? ' · First year' : ''}</p>
            <p className="text-xs text-gray-500">{span} · Year {i + 1} of {years.length}</p>
          </div>
          <button type="button" onClick={() => step(1)} disabled={i === years.length - 1} aria-label="Next year" className={btn}><ChevronRight size={16} /></button>
        </div>
        <input type="range" min={0} max={years.length - 1} step={1} value={i} onChange={e => setPicked(Number(e.target.value))}
          aria-label="Plan year" className="w-full accent-[#0072B2]" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded p-3 border-l-4" style={{ borderColor: C.green, background: '#f0fdf4' }}>
          <p className="text-[10px] text-gray-500 uppercase">Net Monthly Income</p>
          <p className="text-xl font-bold" style={{ color: C.green }}>{$(net)}</p>
        </div>
        <div className="rounded p-3 border-l-4" style={{ borderColor: C.orange, background: '#fff7ed' }}>
          <p className="text-[10px] text-gray-500 uppercase">Total Monthly Spend</p>
          <p className="text-xl font-bold" style={{ color: C.orange }}>{$(spend)}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        {rows.map(row => (
          <div key={row.label} className="flex justify-between items-center gap-2">
            <span className="text-gray-600">{row.label}</span>
            <span className="font-semibold" style={{ color: row.color }}>{row.val > 0 ? '+' : ''}{$(row.val)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center border-t pt-2 mt-1 font-bold">
          <span>Net Monthly {surplus >= 0 ? 'Surplus' : 'Shortfall'}</span>
          <span style={{ color: surplus >= 0 ? C.green : C.vermillion }}>{surplus >= 0 ? '+' : ''}{$(surplus)}</span>
        </div>
        {conversionTax > 0.5 && (
          <p className="text-xs text-gray-400">Plus {$(conversionTax)}/mo of tax on Roth conversions and RMDs, paid from the 403(b), not from the budget.</p>
        )}
      </div>

      {events.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">What changes this year</p>
          <div className="flex flex-wrap gap-1.5">
            {events.map((n, k) => <span key={k} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">{n}</span>)}
          </div>
        </div>
      )}

      {/* How the shortfall is covered */}
      <div className="mt-4 rounded bg-gray-50 border border-gray-100 p-3 text-sm space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">How it's covered</p>
        <div className="flex justify-between gap-2"><span className="text-gray-600">This year</span>
          <span className="font-semibold text-gray-800 text-right">{sources.length > 0 ? `${$(shortfall)} short: ${sources.map(s => `${s.label} ${$(s.val)}`).join(' + ')}` : 'No shortfall'}</span></div>
        <div className="flex justify-between gap-2"><span className="text-gray-600">Savings balance</span>
          <span className="font-semibold text-gray-800 text-right">{$(savingsStart)} → {$(y.endBalanceCash)}</span></div>
        {first403b >= 0 ? (
          <p className="text-xs" style={{ color: C.vermillion }}>
            Across the plan: savings run out in {monthName(first403b)}; after that the 403(b) covers shortfalls
            {firstRoth >= 0 ? `, then the Roth from ${monthName(firstRoth)}` : ''}. Money from the 403(b) is taxed on the way out.
          </p>
        ) : (
          <p className="text-xs" style={{ color: C.green }}>Across the plan, savings cover every shortfall; the 403(b) isn't needed for spending.</p>
        )}
      </div>
    </div>
  );
};
