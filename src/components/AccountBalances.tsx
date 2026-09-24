import type { FC } from 'react';
import type { ProjectionResult } from '../projection';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  projection: ProjectionResult;
}

export const AccountBalances: FC<Props> = ({ projection }) => {
  const data = projection.yearly.map(y => ({
    age: y.age,
    'Savings Balance': y.endBalanceCash,
    '403(b) Balance': y.endBalance403b,
    'Roth Balance': y.endBalanceRoth,
  }));

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="p-0 sm:p-2 h-[520px] sm:h-[600px]">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Account Balances Over Time</h2>
      <div className="bg-white p-2 sm:p-6 rounded-xl shadow-sm border border-gray-100 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
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
            <Line type="monotone" dataKey="Savings Balance" stroke="#6b7280" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="403(b) Balance" stroke="#3b82f6" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="Roth Balance" stroke="#8b5cf6" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
