
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SentimentCounts } from '../types';

interface OverallSentimentChartProps {
  data: SentimentCounts;
}

const sentimentColors = {
  positive: '#22c55e', // green-500
  negative: '#ef4444', // red-500
  neutral: '#64748b',  // slate-500
  mixed: '#eab308',     // yellow-500
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null; // Don't render label if slice is too small

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const OverallSentimentChart: React.FC<OverallSentimentChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Positive', value: data.positive, fill: sentimentColors.positive },
    { name: 'Negative', value: data.negative, fill: sentimentColors.negative },
    { name: 'Neutral', value: data.neutral, fill: sentimentColors.neutral },
    { name: 'Mixed', value: data.mixed, fill: sentimentColors.mixed },
  ].filter(item => item.value > 0); // Don't show segments with 0 value

  if (chartData.length === 0) {
    return <div className="text-center text-slate-400 p-8">No sentiment data to display.</div>;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={110}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            cursor={{ fill: 'rgba(203, 213, 225, 0.1)' }}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#1e293b'
            }}
            itemStyle={{ color: '#334155' }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
