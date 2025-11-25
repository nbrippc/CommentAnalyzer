
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { Theme } from '../types';

interface ThemesSummaryChartProps {
  themes: Theme[];
  analysisType: 'both' | 'theme-only' | 'sentiment-only';
}

const sentimentColors = {
  positive: '#22c55e', // green-500
  negative: '#ef4444', // red-500
  neutral: '#64748b',  // slate-500
  mixed: '#eab308',     // yellow-500
  total: '#06b6d4',     // cyan-500 (for theme-only)
};

export const ThemesSummaryChart: React.FC<ThemesSummaryChartProps> = ({ themes, analysisType }) => {
  const data = themes.map(t => ({
    name: t.theme,
    positive: t.sentiment.positive,
    neutral: t.sentiment.neutral,
    negative: t.sentiment.negative,
    mixed: t.sentiment.mixed,
    total: t.sentiment.positive + t.sentiment.neutral + t.sentiment.negative + t.sentiment.mixed
  }));

  const isThemeOnly = analysisType === 'theme-only';

  return (
    <div style={{ width: '100%', height: Math.max(300, themes.length * 50) }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={120} 
            tick={{ fill: '#64748b', fontSize: 12 }}
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
            formatter={(value: number, name: string, props: any) => {
               const total = props.payload.total;
               if (isThemeOnly) {
                 return [value, "Count"];
               }
               const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
               return [`${value} (${percent}%)`, name.charAt(0).toUpperCase() + name.slice(1)];
            }}
          />
          {!isThemeOnly && <Legend />}
          
          {isThemeOnly ? (
             <Bar dataKey="total" fill={sentimentColors.total} name="Total Count" radius={[0, 4, 4, 0]} />
          ) : (
            <>
              <Bar dataKey="positive" stackId="a" fill={sentimentColors.positive} name="Positive" />
              <Bar dataKey="neutral" stackId="a" fill={sentimentColors.neutral} name="Neutral" />
              <Bar dataKey="negative" stackId="a" fill={sentimentColors.negative} name="Negative" />
              <Bar dataKey="mixed" stackId="a" fill={sentimentColors.mixed} name="Mixed" />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
