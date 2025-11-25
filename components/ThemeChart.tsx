
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { SentimentCounts } from '../types';

interface ThemeChartProps {
  sentiment: SentimentCounts;
}

const sentimentColors = {
  positive: '#22c55e', // green-500
  negative: '#ef4444', // red-500
  neutral: '#64748b',  // slate-500
  mixed: '#eab308',     // yellow-500
};

export const ThemeChart: React.FC<ThemeChartProps> = ({ sentiment }) => {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative + sentiment.mixed;

  const data = [
    { name: 'Positive', count: sentiment.positive, fill: sentimentColors.positive },
    { name: 'Negative', count: sentiment.negative, fill: sentimentColors.negative },
    { name: 'Neutral', count: sentiment.neutral, fill: sentimentColors.neutral },
    { name: 'Mixed', count: sentiment.mixed, fill: sentimentColors.mixed },
  ];

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 14 }}
            width={70}
           />
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
            labelStyle={{ color: '#0f172a', fontWeight: 600, marginBottom: '0.25rem' }}
            formatter={(value: number, name: string) => {
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return [`${value} (${percent}%)`, name];
            }}
          />
          <Bar dataKey="count" barSize={20} radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
