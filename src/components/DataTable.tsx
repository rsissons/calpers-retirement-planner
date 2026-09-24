import { useState } from 'react';
import type { FC } from 'react';
import type { ProjectionResult, YearlyData, MonthlyData } from '../projection';
import type { Config } from '../config';
import { rmdStartAge } from '../calpers';

interface Props {
  config: Config;
  projection: ProjectionResult;
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatPct = (value: number) =>
  `${(value * 100).toFixed(1)}%`;

// Signed gap: positive = surplus (+), negative = shortfall (-)
const formatGap = (gap: number) => {
  if (gap <= 0) {
    // Surplus: gap is negative or zero (expenses < income)
    return `+${formatCurrency(-gap)}`;
  } else {
    // Shortfall: gap is positive (expenses > income)
    return `-${formatCurrency(gap)}`;
  }
};

export const DataTable: FC<Props> = ({ config, projection }) => {
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const spouse = config.hasSpouse;
  const partner = config.spouseName || 'Spouse';
  const you = config.yourName || 'You';
  const showSpousePension = spouse && config.spousePension > 0;

  const yearlyRows = projection.yearly;
  const monthlyRows = projection.yearly.flatMap(y => y.months);

  // Calculate start-of-year balance for withdrawal % column
  const startBalances: Record<number, number> = {};
  let runningBalance = config.startingCash + config.starting403b + config.startingRoth;
  projection.yearly.forEach(y => {
    startBalances[y.age] = runningBalance;
    runningBalance = y.endBalanceCash + y.endBalance403b + y.endBalanceRoth;
  });

  const getWithdrawalPct = (y: YearlyData) => {
    const start = startBalances[y.age];
    if (!start || start <= 0) return 0;
    return (y.totalWithdrawalCash + y.totalWithdrawal403b + y.totalWithdrawalRoth) / start;
  };

  const getMonthlyWithdrawalPct = (m: MonthlyData) => {
    // Use approximate start balance for the year
    const start = startBalances[m.age];
    if (!start || start <= 0) return 0;
    return ((m.withdrawalCash + m.withdrawal403b + m.withdrawalRoth) * 12) / start; // annualized
  };

  const COL_SURPLUS = 'text-[#009E73] font-medium';  // Blue-green = good
  const COL_SHORTFALL = 'text-[#D55E00] font-medium'; // Vermillion = gap
  const COL_TAXES = 'text-[#D55E00]';
  const COL_NET = 'font-bold bg-[#009E73]/10 text-[#009E73]';
  const COL_403B = 'text-[#56B4E9] font-medium';
  const COL_ROTH = 'text-[#0072B2] font-medium';
  const COL_CONV = 'text-[#0072B2]';
  const COL_WITHD = 'text-[#E69F00]'; // Orange for withdrawals

  return (
    <div className="p-0 sm:p-2">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Projected {projection.yearly.length}-Year Table (to Age {projection.yearly[projection.yearly.length - 1].age})</h2>
          <p className="text-xs text-gray-500 mt-1">
            <span className={COL_SURPLUS}>+$X = Surplus (income &gt; expenses)</span>
            <span className="mx-2">·</span>
            <span className={COL_SHORTFALL}>-$X = Shortfall (covered by savings, then 403b, then Roth)</span>
            <span className="mx-2">·</span>
            <span className={COL_403B}>403b</span> and <span className={COL_ROTH}>Roth</span> grow at {(config.annualReturn * 100).toFixed(1)}%/yr
          </p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 sm:ml-4">
          <button 
            onClick={() => setViewMode('yearly')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Yearly
          </button>
          <button 
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs font-medium">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#009E73'}}></span>Net Income / Surplus</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#D55E00'}}></span>Taxes / Shortfall</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#E69F00'}}></span>Withdrawals from Accounts</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#56B4E9'}}></span>403b Balance</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#0072B2'}}></span>Roth Balance / Conversion</span>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">Age {viewMode === 'monthly' && '(Mo)'}</th>
                <th className="px-3 py-3">Pension</th>
                {showSpousePension && <th className="px-3 py-3">{partner}<br/>Pension</th>}
                {spouse && <th className="px-3 py-3">{partner}<br/>Net Pay</th>}
                {spouse && <th className="px-3 py-3">{partner}<br/>SS</th>}
                <th className="px-3 py-3">{you}<br/>SS</th>
                <th className="px-3 py-3">Healthcare<br/><span className="text-[10px] font-normal text-gray-400">(deducted)</span></th>
                <th className={`px-3 py-3 ${COL_TAXES}`} title="Tax on pensions, 403b withdrawals & Social Security (take-home pay is already taxed)">Income<br/>Tax<br/><span className="text-[10px] font-normal">(deducted)</span></th>
                <th className={`px-3 py-3 font-bold text-[#009E73]`} title="Gross income minus healthcare and income tax: what you actually have to spend">Net Income<br/><span className="text-[10px] font-normal text-green-600">after tax & healthcare</span></th>
                <th className="px-3 py-3">Essential</th>
                <th className="px-3 py-3">Discret.</th>
                <th className="px-3 py-3" title="Fixed loan payments. Each stops at its payoff date.">Loans</th>
                <th className={`px-3 py-3 font-bold text-gray-700`} title="Essential + Discretionary + Loans. Healthcare and taxes already removed from Net Income above.">Total Spend ⓘ<br/><span className="text-[10px] font-normal text-gray-400">Ess + Disc + Loans</span></th>
                <th className={`px-3 py-3 text-[#009E73]`}>+Surplus<br/><span className="text-[#D55E00]">-Shortfall</span></th>
                <th className={`px-3 py-3 ${COL_TAXES}`} title="Tax owed when converting 403b funds to Roth IRA">Conv.<br/>Tax</th>
                <th className={`px-3 py-3 ${COL_WITHD}`}>Savings<br/>Withdrawal</th>
                <th className={`px-3 py-3 ${COL_WITHD}`}>403b<br/>Withdrawal</th>
                <th className={`px-3 py-3 ${COL_WITHD}`}>Roth<br/>Withdrawal</th>
                <th className={`px-3 py-3 ${COL_WITHD} whitespace-nowrap`}>Withdraw<br/>% (Ann.)</th>
                <th className={`px-3 py-3 ${COL_CONV}`}>Roth<br/>Conv.</th>
                <th className={`px-3 py-3 ${COL_WITHD}`} title={`IRS required minimum distribution from the 403b (Uniform Lifetime Table), starting the year ${you} turns ${rmdStartAge(config.yourBirthDate)}. Withdrawals and conversions count toward it; any shortfall is taken, taxed, and moved to savings.`}>RMD</th>
                <th className="px-3 py-3 text-gray-600">Savings<br/>Balance</th>
                <th className={`px-3 py-3 ${COL_403B}`}>403b<br/>Balance</th>
                <th className={`px-3 py-3 ${COL_ROTH}`}>Roth<br/>Balance</th>
                <th className="px-3 py-3 text-gray-500 min-w-[220px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {viewMode === 'yearly' && yearlyRows.map((y) => {
                const wPct = getWithdrawalPct(y);
                const isShortfall = y.totalGap > 0;
                return (
                  <tr key={`y-${y.age}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-nowrap">{y.age}</td>
                    <td className="px-3 py-2.5">{formatCurrency(y.totalPension)}</td>
                    {showSpousePension && <td className="px-3 py-2.5">{formatCurrency(y.totalSpousePension)}</td>}
                    {spouse && <td className="px-3 py-2.5">{formatCurrency(y.totalSpouseSalary)}</td>}
                    {spouse && <td className="px-3 py-2.5">{formatCurrency(y.totalSpouseSS)}</td>}
                    <td className="px-3 py-2.5">{formatCurrency(y.totalYourSS)}</td>
                    <td className="px-3 py-2.5 text-red-400">{y.totalInsurance + y.totalMedicare > 0 ? `−${formatCurrency(y.totalInsurance + y.totalMedicare)}` : '—'}</td>
                    <td className={`px-3 py-2.5 ${COL_TAXES}`}>−{formatCurrency(y.totalIncomeTaxes)}</td>
                    <td className={`px-3 py-2.5 font-bold ${COL_NET}`}>{formatCurrency(y.totalNetIncome)}</td>
                    <td className="px-3 py-2.5">{formatCurrency(y.totalEssentialSpending)}</td>
                    <td className="px-3 py-2.5">{formatCurrency(y.totalDiscretionarySpending)}</td>
                    <td className="px-3 py-2.5">{y.totalDebtPayments > 0 ? formatCurrency(y.totalDebtPayments) : '—'}</td>
                    <td className="px-3 py-2.5 font-bold" title={`Essential ${formatCurrency(y.totalEssentialSpending)} + Discretionary ${formatCurrency(y.totalDiscretionarySpending)} + Loans ${formatCurrency(y.totalDebtPayments)}`}>{formatCurrency(y.totalEssentialSpending + y.totalDiscretionarySpending + y.totalDebtPayments)}</td>
                    <td className={`px-3 py-2.5 ${isShortfall ? COL_SHORTFALL : COL_SURPLUS}`}>
                      {formatGap(y.totalGap)}
                    </td>
                    <td className={`px-3 py-2.5 ${COL_TAXES}`}>{y.totalConversionTaxes > 0 ? formatCurrency(y.totalConversionTaxes) : '—'}</td>
                    <td className={`px-3 py-2.5 ${COL_WITHD}`}>
                      {y.totalWithdrawalCash > 0 ? formatCurrency(y.totalWithdrawalCash) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 ${COL_WITHD}`}>
                      {y.totalWithdrawal403b > 0 ? formatCurrency(y.totalWithdrawal403b) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 ${COL_WITHD}`}>
                      {y.totalWithdrawalRoth > 0 ? formatCurrency(y.totalWithdrawalRoth) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 ${wPct > 0.04 ? COL_SHORTFALL : wPct > 0 ? COL_WITHD : 'text-gray-400'}`}>
                      {wPct > 0 ? formatPct(wPct) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 ${COL_CONV}`}>
                      {y.totalConversionToRoth > 0 ? formatCurrency(y.totalConversionToRoth) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 ${COL_WITHD}`}>{y.rmdRequired > 0 ? formatCurrency(y.rmdRequired) : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{formatCurrency(y.endBalanceCash)}</td>
                    <td className={`px-3 py-2.5 ${COL_403B}`}>{formatCurrency(y.endBalance403b)}</td>
                    <td className={`px-3 py-2.5 ${COL_ROTH}`}>{formatCurrency(y.endBalanceRoth)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        {y.notes.map((note, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 whitespace-nowrap">{note}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {viewMode === 'monthly' && monthlyRows.map((m, idx) => {
                const wPct = getMonthlyWithdrawalPct(m);
                const isShortfall = m.gap > 0;
                return (
                  <tr key={`m-${idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{m.age} / Mo {m.monthIndex + 1}</td>
                    <td className="px-3 py-2">{formatCurrency(m.pension)}</td>
                    {showSpousePension && <td className="px-3 py-2">{formatCurrency(m.spousePension)}</td>}
                    {spouse && <td className="px-3 py-2">{formatCurrency(m.spouseSalary)}</td>}
                    {spouse && <td className="px-3 py-2">{formatCurrency(m.spouseSS)}</td>}
                    <td className="px-3 py-2">{formatCurrency(m.yourSS)}</td>
                    <td className="px-3 py-2 text-red-400">{m.insurance + m.medicare > 0 ? `−${formatCurrency(m.insurance + m.medicare)}` : '—'}</td>
                    <td className={`px-3 py-2 ${COL_TAXES}`}>−{formatCurrency(m.incomeTaxes)}</td>
                    <td className={`px-3 py-2 font-bold ${COL_NET}`}>{formatCurrency(m.netIncome)}</td>
                    <td className="px-3 py-2">{formatCurrency(m.essentialSpending)}</td>
                    <td className="px-3 py-2">{formatCurrency(m.discretionarySpending)}</td>
                    <td className="px-3 py-2">{m.debtPayments > 0 ? formatCurrency(m.debtPayments) : '—'}</td>
                    <td className="px-3 py-2 font-bold" title={`Essential ${formatCurrency(m.essentialSpending)} + Discretionary ${formatCurrency(m.discretionarySpending)} + Loans ${formatCurrency(m.debtPayments)}`}>{formatCurrency(m.essentialSpending + m.discretionarySpending + m.debtPayments)}</td>
                    <td className={`px-3 py-2 ${isShortfall ? COL_SHORTFALL : COL_SURPLUS}`}>
                      {formatGap(m.gap)}
                    </td>
                    <td className={`px-3 py-2 ${COL_TAXES}`}>{m.conversionTaxes > 0 ? formatCurrency(m.conversionTaxes) : '—'}</td>
                    <td className={`px-3 py-2 ${COL_WITHD}`}>
                      {m.withdrawalCash > 0 ? formatCurrency(m.withdrawalCash) : '—'}
                    </td>
                    <td className={`px-3 py-2 ${COL_WITHD}`}>
                      {m.withdrawal403b > 0 ? formatCurrency(m.withdrawal403b) : '—'}
                    </td>
                    <td className={`px-3 py-2 ${COL_WITHD}`}>
                      {m.withdrawalRoth > 0 ? formatCurrency(m.withdrawalRoth) : '—'}
                    </td>
                    <td className={`px-3 py-2 ${wPct > 0.04 ? COL_SHORTFALL : wPct > 0 ? COL_WITHD : 'text-gray-400'}`}>
                      {wPct > 0 ? formatPct(wPct) : '—'}
                    </td>
                    <td className={`px-3 py-2 ${COL_CONV}`}>
                      {m.conversionToRoth > 0 ? formatCurrency(m.conversionToRoth) : '—'}
                    </td>
                    <td className={`px-3 py-2 ${COL_WITHD}`}>{m.rmdWithdrawal > 0 ? formatCurrency(m.rmdWithdrawal) : '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{formatCurrency(m.balanceCash)}</td>
                    <td className={`px-3 py-2 ${COL_403B}`}>{formatCurrency(m.balance403b)}</td>
                    <td className={`px-3 py-2 ${COL_ROTH}`}>{formatCurrency(m.balanceRoth)}</td>
                    <td className="px-3 py-2 text-xs text-gray-400 italic">—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
