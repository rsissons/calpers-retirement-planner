import type { FC } from 'react';
import type { Config } from '../config';
import type { ProjectionResult } from '../projection';
import { formulaById, systemOf } from '../formulas';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

interface Props {
  config: Config;
  projection: ProjectionResult;
}

export const IncomeBreakdown: FC<Props> = ({ config, projection }) => {
  const partner = config.spouseName || 'Spouse';
  const you = config.yourName || 'You';
  const spouse = config.hasSpouse;

  // Each income stream as its own stacked bar, with total spending (incl. health and taxes) as a line
  const series = [
    { key: `${systemOf(formulaById(config.pensionFormulaId))} Pension`, color: '#3b82f6', get: (y: ProjectionResult['yearly'][number]) => y.totalPension, show: true },
    { key: `${partner} Pension`, color: '#0ea5e9', get: (y: ProjectionResult['yearly'][number]) => y.totalSpousePension, show: spouse },
    { key: `${partner} ${config.spousePayIsGross ? 'Pay' : 'Take-Home'}`, color: '#10b981', get: (y: ProjectionResult['yearly'][number]) => y.totalSpouseSalary, show: spouse },
    { key: `${you} Job`, color: '#14b8a6', get: (y: ProjectionResult['yearly'][number]) => y.totalJobPay, show: true },
    { key: `${partner} SS`, color: '#f59e0b', get: (y: ProjectionResult['yearly'][number]) => y.totalSpouseSS, show: spouse },
    { key: `${you} SS`, color: '#8b5cf6', get: (y: ProjectionResult['yearly'][number]) => y.totalYourSS, show: true },
  ].filter(s => s.show && projection.yearly.some(y => s.get(y) > 0));

  const data = projection.yearly.map(y => ({
    age: y.age,
    ...Object.fromEntries(series.map(s => [s.key, s.get(y)])),
    Spending: y.totalExpenses,
  }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="p-0 sm:p-2 h-[520px] sm:h-[600px]">
      <h2 className="text-xl sm:text-2xl font-bold mb-1 text-gray-800">Income vs Spending</h2>
      <p className="text-xs text-gray-500 mb-4">Yearly totals. The red line is all spending, including health costs, income tax and payroll tax.</p>
      <div className="bg-white p-2 sm:p-6 rounded-xl shadow-sm border border-gray-100 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="age" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              width={48}
            />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={l => `Age ${l}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map(s => <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} />)}
            <Line type="monotone" dataKey="Spending" stroke="#ef4444" strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
