import type { FC } from 'react';
import type { ProjectionResult } from '../projection';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  projection: ProjectionResult;
}

export const FundingSource: FC<Props> = ({ projection }) => {
  const data = projection.yearly.map(y => ({
    age: y.age,
    'Savings Withdrawals': y.totalWithdrawalCash,
    '403(b) Withdrawals': y.totalWithdrawal403b,
    'Roth Withdrawals': y.totalWithdrawalRoth,
  }));

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="p-0 sm:p-2 h-[520px] sm:h-[600px]">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Funding Source for Shortfall</h2>
      <div className="bg-white p-2 sm:p-6 rounded-xl shadow-sm border border-gray-100 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="age" tickLine={false} axisLine={false} tick={{ fill: '#6b7280' }} />
            <YAxis 
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
              width={48} 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#6b7280' }} 
            />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Area type="monotone" dataKey="Savings Withdrawals" stackId="1" stroke="#6b7280" fill="#d1d5db" />
            <Area type="monotone" dataKey="403(b) Withdrawals" stackId="1" stroke="#3b82f6" fill="#93c5fd" />
            <Area type="monotone" dataKey="Roth Withdrawals" stackId="1" stroke="#8b5cf6" fill="#c4b5fd" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
