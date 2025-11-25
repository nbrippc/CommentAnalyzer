
import React, { useState, useMemo } from 'react';
import type { AnalysisResult } from '../types';
import { Card } from './common/Card';
import { Loader } from './common/Loader';
import { ErrorMessage } from './common/ErrorMessage';
import { ThemeChart } from './ThemeChart';
import { OverallSentimentChart } from './OverallSentimentChart';
import { ThemesSummaryChart } from './ThemesSummaryChart';
import { 
  Sparkles, Lightbulb, CheckCircle, Download, PieChart, Share2, Check, 
  FileText, Filter, Quote, BarChart3, Table, Tag
} from 'lucide-react';

// pako is loaded from CDN in index.html
declare const pako: any;


interface AnalysisResultsProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  logoUrl: string;
}

const InitialState = () => (
  <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 transition-colors duration-200">
    <Sparkles className="mx-auto h-12 w-12 text-cyan-500 dark:text-cyan-400" />
    <h3 className="mt-4 text-xl font-semibold text-slate-800 dark:text-white">Ready to uncover insights?</h3>
    <p className="mt-2 text-slate-500 dark:text-slate-400">Your survey analysis will appear here once you submit your comments.</p>
  </div>
);

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ result, isLoading, error, logoUrl }) => {
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [minCommentThreshold, setMinCommentThreshold] = useState(0);
  
  // Default to 'both' if not present (backward compatibility)
  const analysisType = result?.analysisType || 'both';

  // Filter themes based on threshold AND sort by total count (Largest to Smallest)
  const filteredThemes = useMemo(() => {
    if (!result) return [];
    
    const themes = result.themes.filter(theme => {
      const total = theme.sentiment.positive + theme.sentiment.neutral + theme.sentiment.negative + theme.sentiment.mixed;
      return total >= minCommentThreshold;
    });

    // Sort descending by total count
    return themes.sort((a, b) => {
        const totalA = a.sentiment.positive + a.sentiment.neutral + a.sentiment.negative + a.sentiment.mixed;
        const totalB = b.sentiment.positive + b.sentiment.neutral + b.sentiment.negative + b.sentiment.mixed;
        return totalB - totalA;
    });
  }, [result, minCommentThreshold]);

  const grandTotal = useMemo(() => {
    if (!result) return 0;
    return result.themes.reduce((total, theme) => {
      return total + theme.sentiment.positive + theme.sentiment.neutral + theme.sentiment.negative + theme.sentiment.mixed;
    }, 0);
  }, [result]);

  // Recalculate overall sentiment based on FILTERED themes
  const overallSentiment = useMemo(() => {
    return filteredThemes.reduce((acc, theme) => {
      acc.positive += theme.sentiment.positive;
      acc.neutral += theme.sentiment.neutral;
      acc.negative += theme.sentiment.negative;
      acc.mixed += theme.sentiment.mixed;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0, mixed: 0 });
  }, [filteredThemes]);

  if (isLoading) {
    return <Loader />;
  }
  if (error) {
    return <ErrorMessage message={error} />;
  }
  if (!result) {
    return <InitialState />;
  }

  const escapeCSV = (str: string | number | undefined) => {
    const s = String(str || '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleExportCsv = () => {
    if (!result) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Survey Question
    if (result.surveyQuestion) {
        csvContent += `Survey Question,"${escapeCSV(result.surveyQuestion)}"\n\n`;
    }

    // Themes section
    if (analysisType === 'theme-only') {
        csvContent += "Themes Volume\n";
        csvContent += "Theme,Total Count\n";
        filteredThemes.forEach(themeData => {
            const themeTotal = themeData.sentiment.neutral; // In theme-only, neutral holds the total
            const row = [themeData.theme, themeTotal].map(escapeCSV).join(",");
            csvContent += row + "\n";
        });
    } else if (analysisType === 'sentiment-only') {
        csvContent += "Sentiment Distribution\n";
        csvContent += "Sentiment,Count\n";
        filteredThemes.forEach(themeData => {
            const themeTotal = themeData.sentiment.positive + themeData.sentiment.neutral + themeData.sentiment.negative + themeData.sentiment.mixed;
             // In sentiment-only, theme name IS the sentiment (e.g. "Positive Feedback")
            const row = [themeData.theme, themeTotal].map(escapeCSV).join(",");
            csvContent += row + "\n";
        });
    } else {
        // Both
        csvContent += "Themes & Sentiment\n";
        const themeHeaders = ["Theme", "Positive", "Neutral", "Negative", "Mixed", "Total"];
        csvContent += themeHeaders.join(",") + "\n";
        filteredThemes.forEach(themeData => {
            const themeTotal = themeData.sentiment.positive + themeData.sentiment.neutral + themeData.sentiment.negative + themeData.sentiment.mixed;
            const row = [
              themeData.theme,
              themeData.sentiment.positive,
              themeData.sentiment.neutral,
              themeData.sentiment.negative,
              themeData.sentiment.mixed,
              themeTotal
            ].map(escapeCSV).join(",");
            csvContent += row + "\n";
        });
    }
    
    csvContent += `\nOverall Total Comments Analyzed,${grandTotal}\n\n\n`;

    // Insights section
    csvContent += "Actionable Insights & Recommendations\n";
    const insightHeaders = ["Insight", "Category/Theme", "Recommendation", "Evidence/Quotes"];
    csvContent += insightHeaders.join(",") + "\n";

    result.insights.forEach(item => {
      const quotes = item.quotes ? item.quotes.join("; ") : "";
      const row = [item.insight, item.relatedTheme, item.recommendation, quotes].map(escapeCSV).join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "survey_analysis_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDetailCsv = () => {
    if (!result || !result.comments) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (analysisType === 'theme-only') {
        csvContent += "Comment,Theme\n";
        result.comments.forEach(c => {
            const row = [c.text, c.theme].map(escapeCSV).join(",");
            csvContent += row + "\n";
        });
    } else if (analysisType === 'sentiment-only') {
        csvContent += "Comment,Sentiment\n";
        result.comments.forEach(c => {
             // In sentiment-only, theme is redundant with sentiment, but strictly comment+sentiment is requested
            const row = [c.text, c.sentiment].map(escapeCSV).join(",");
            csvContent += row + "\n";
        });
    } else {
        csvContent += "Comment,Theme,Sentiment\n";
        result.comments.forEach(c => {
            const row = [c.text, c.theme, c.sentiment].map(escapeCSV).join(",");
            csvContent += row + "\n";
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "survey_comment_details.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportHtml = () => {
    if (!result) return;

    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    // Data for Charts
    const overallChartData = {
        labels: ['Positive', 'Neutral', 'Negative', 'Mixed'],
        datasets: [{
            data: [overallSentiment.positive, overallSentiment.neutral, overallSentiment.negative, overallSentiment.mixed],
            backgroundColor: ['#22c55e', '#64748b', '#ef4444', '#eab308'],
            borderWidth: 0
        }]
    };

    const themesChartData = {
        labels: filteredThemes.map(t => t.theme),
        datasets: [
             { label: 'Positive', data: filteredThemes.map(t => t.sentiment.positive), backgroundColor: '#22c55e' },
             { label: 'Neutral', data: filteredThemes.map(t => t.sentiment.neutral), backgroundColor: '#64748b' },
             { label: 'Negative', data: filteredThemes.map(t => t.sentiment.negative), backgroundColor: '#ef4444' },
             { label: 'Mixed', data: filteredThemes.map(t => t.sentiment.mixed), backgroundColor: '#eab308' }
        ]
    };
    
    if (analysisType === 'theme-only') {
        // Simplified dataset for theme only
        themesChartData.datasets = [
            { label: 'Count', data: filteredThemes.map(t => t.sentiment.neutral), backgroundColor: '#06b6d4' }
        ] as any;
    }

    let themesTableContent = '';
    if (analysisType === 'theme-only') {
         const rows = filteredThemes.map(theme => `
            <tr>
                <td>${theme.theme}</td>
                <td class="num font-bold">${theme.sentiment.neutral}</td>
            </tr>
         `).join('');
         themesTableContent = `
            <table>
                <thead>
                    <tr><th>Theme</th><th class="num">Count</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
         `;
    } else if (analysisType === 'both') {
         const rows = filteredThemes.map(theme => {
            const total = theme.sentiment.positive + theme.sentiment.neutral + theme.sentiment.negative + theme.sentiment.mixed;
            return `
                <tr>
                <td>${theme.theme}</td>
                <td class="num positive">${theme.sentiment.positive}</td>
                <td class="num neutral">${theme.sentiment.neutral}</td>
                <td class="num negative">${theme.sentiment.negative}</td>
                <td class="num mixed">${theme.sentiment.mixed}</td>
                <td class="num font-bold">${total}</td>
                </tr>
            `;
        }).join('');
        themesTableContent = `
            <table>
                <thead>
                    <tr>
                        <th>Theme</th>
                        <th class="num">Positive</th>
                        <th class="num">Neutral</th>
                        <th class="num">Negative</th>
                        <th class="num">Mixed</th>
                        <th class="num">Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }
    // For sentiment-only, we skip the table

    const insightsRows = result.insights.map(item => {
        const quotesHtml = item.quotes && item.quotes.length > 0 
            ? `<div class="quotes-section">
                <div class="quotes-title">Voice of the Customer</div>
                <ul>
                    ${item.quotes.map(q => `<li>"${q}"</li>`).join('')}
                </ul>
               </div>`
            : '';

        return `
            <div class="insight-card">
                ${item.relatedTheme ? `<div class="theme-tag">${item.relatedTheme}</div>` : ''}
                <div class="insight-title">Insight</div>
                <div class="insight-text">${item.insight}</div>
                <div class="recommendation-title">Recommendation</div>
                <div class="recommendation-text">${item.recommendation}</div>
                ${quotesHtml}
            </div>
        `;
    }).join('');
    
    const chartSectionTitle = analysisType === 'theme-only' ? 'Key Themes' : (analysisType === 'sentiment-only' ? 'Sentiment' : 'Key Themes & Sentiment');
    const barChartTitle = analysisType === 'theme-only' ? 'Themes Volume' : (analysisType === 'sentiment-only' ? 'Sentiment' : 'Themes Sentiment Breakdown');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Survey Analysis Report</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 960px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc; }
          .container { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
          h1 { color: #0f172a; margin: 0; font-size: 2.2em; }
          h2 { color: #1e293b; margin-top: 40px; margin-bottom: 20px; font-size: 1.5em; border-left: 4px solid #06b6d4; padding-left: 12px; }
          .meta { margin-bottom: 32px; background-color: #f1f5f9; padding: 16px; border-radius: 6px; }
          .meta-item { margin-bottom: 8px; }
          .meta-label { font-weight: 600; color: #475569; width: 150px; display: inline-block; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.95em; }
          th { background-color: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          tr:last-child td { border-bottom: none; }
          .num { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .positive { color: #16a34a; }
          .negative { color: #dc2626; }
          .neutral { color: #64748b; }
          .mixed { color: #ca8a04; }
          .font-bold { font-weight: 700; }
          .insight-card { background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative; }
          .insight-title { text-transform: uppercase; font-size: 0.75em; font-weight: 700; color: #06b6d4; letter-spacing: 0.05em; margin-bottom: 4px; }
          .insight-text { font-size: 1.1em; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
          .recommendation-title { text-transform: uppercase; font-size: 0.75em; font-weight: 700; color: #16a34a; letter-spacing: 0.05em; margin-bottom: 4px; }
          .recommendation-text { color: #475569; margin-bottom: 16px; }
          .quotes-section { background-color: #f8fafc; border-left: 3px solid #cbd5e1; padding: 12px 16px; margin-top: 12px; border-radius: 0 4px 4px 0; }
          .quotes-title { font-size: 0.75em; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
          .quotes-section ul { margin: 0; padding-left: 20px; list-style-type: disc; color: #475569; }
          .quotes-section li { font-style: italic; font-size: 0.9em; margin-bottom: 4px; }
          .theme-tag { display: inline-block; background: #ecfeff; color: #0e7490; font-size: 0.75em; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-bottom: 8px; border: 1px solid #cffafe; }
          .footer { margin-top: 60px; text-align: center; font-size: 0.85em; color: #94a3b8; }
          .filter-note { font-style: italic; font-size: 0.8em; color: #64748b; margin-top: 10px; }
          
          /* Chart Styles */
          .charts-container { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
          .chart-box { width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-sizing: border-box; }
          .chart-box h3 { margin-top: 0; font-size: 1em; color: #475569; text-align: center; margin-bottom: 10px;}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Survey Analysis Report</h1>
          </div>
          
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Date:</span>
              ${date} at ${time}
            </div>
            ${result.surveyQuestion ? `
            <div class="meta-item">
              <span class="meta-label">Question/Context:</span>
              ${result.surveyQuestion}
            </div>
            ` : ''}
            <div class="meta-item">
              <span class="meta-label">Total Comments:</span>
              ${grandTotal}
            </div>
          </div>

          <h2>Visual Analysis</h2>
          <div class="charts-container">
             <div class="chart-box">
                <h3>${barChartTitle}</h3>
                <div style="height: ${Math.max(300, filteredThemes.length * 40)}px; position: relative;">
                    <canvas id="themesChart"></canvas>
                </div>
            </div>
            ${analysisType !== 'theme-only' ? `
            <div class="chart-box">
                <h3>Overall Sentiment</h3>
                <div style="height: 300px; position: relative;">
                    <canvas id="overallChart"></canvas>
                </div>
            </div>
            ` : ''}
          </div>

          ${themesTableContent ? `
          <h2>${chartSectionTitle}</h2>
          ${minCommentThreshold > 0 ? `<div class="filter-note">Filtered to show themes with ${minCommentThreshold} or more comments.</div>` : ''}
          ${themesTableContent}
          ` : ''}

          <h2>Insights & Recommendations</h2>
          <div class="insights-container">
            ${insightsRows}
          </div>

          <div class="footer">
            Generated by NBRI Survey Comment Analyzer
          </div>
        </div>

        <script>
            const overallData = ${JSON.stringify(overallChartData)};
            const themesData = ${JSON.stringify(themesChartData)};
            
            ${analysisType !== 'theme-only' ? `
            // Initialize Overall Sentiment Chart
            new Chart(document.getElementById('overallChart'), {
                type: 'doughnut',
                data: overallData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
            ` : ''}

            // Initialize Themes Bar Chart
            new Chart(document.getElementById('themesChart'), {
                type: 'bar',
                data: themesData,
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: ${analysisType !== 'theme-only' ? 'true' : 'false'} },
                        y: { stacked: ${analysisType !== 'theme-only' ? 'true' : 'false'} }
                    },
                    plugins: {
                        legend: { position: 'bottom', display: ${analysisType !== 'theme-only' ? 'true' : 'false'} },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.x;
                                    ${analysisType === 'theme-only' ? `return label + ': ' + value;` : `
                                    const dataIndex = context.dataIndex;
                                    const datasets = context.chart.data.datasets;
                                    let total = 0;
                                    for (let i = 0; i < datasets.length; i++) {
                                        total += datasets[i].data[dataIndex];
                                    }
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                    return label + ': ' + value + ' (' + percentage + ')';
                                    `}
                                }
                            }
                        }
                    }
                }
            });
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `survey-analysis-report-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleShare = () => {
    if (!result) return;

    try {
      const jsonString = JSON.stringify(result);
      const compressed = pako.deflate(jsonString);
      
      const binaryString = String.fromCharCode.apply(null, compressed as any);
      const base64String = btoa(binaryString);
      const urlSafeBase64 = base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const url = new URL(window.location.href);
      const shareUrl = `${url.origin}${url.pathname}#${urlSafeBase64}`;

      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      });
    } catch (e) {
      console.error("Failed to create share link:", e);
      alert("Could not create shareable link.");
    }
  };


  // Determine dynamic section titles
  let sectionTitle = 'Key Themes & Sentiment';
  if (analysisType === 'theme-only') sectionTitle = 'Key Themes';
  if (analysisType === 'sentiment-only') sectionTitle = 'Sentiment';

  let barChartTitle = 'Themes Sentiment Breakdown';
  if (analysisType === 'theme-only') barChartTitle = 'Themes Volume';
  if (analysisType === 'sentiment-only') barChartTitle = 'Sentiment';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 transition-colors duration-200">
                Analysis Results
            </h2>
            {result.surveyQuestion && (
                <p className="mt-2 text-slate-500 dark:text-slate-400 italic">
                For question: "{result.surveyQuestion}"
                </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm transition-all duration-200 text-sm"
            >
              {isLinkCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                  Copied
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share
                </>
              )}
            </button>
             <button
              onClick={handleExportHtml}
              className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm transition-colors duration-200 text-sm"
            >
              <FileText className="w-4 h-4" />
              HTML
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm transition-colors duration-200 text-sm"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            {result.comments && result.comments.length > 0 && (
                <button
                onClick={handleExportDetailCsv}
                className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg shadow-sm transition-colors duration-200 text-sm"
                >
                <Table className="w-4 h-4" />
                Comment Detail
                </button>
            )}
          </div>
      </div>


      {/* Themes Section */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
             <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center transition-colors duration-200">
                <Sparkles className="w-8 h-8 mr-3 text-cyan-500 dark:text-cyan-400" />
                {sectionTitle}
            </h2>
            
            {/* Threshold Controls */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg flex items-center gap-4 w-full sm:w-auto shadow-sm transition-colors duration-200">
                <div className="flex items-center text-slate-600 dark:text-slate-300 gap-2">
                    <Filter className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                    <span className="text-sm font-medium whitespace-nowrap">Filter Noise:</span>
                </div>
                <div className="flex items-center gap-3 flex-grow">
                    <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="1" 
                        value={minCommentThreshold}
                        onChange={(e) => setMinCommentThreshold(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-200 min-w-[60px] text-center">
                        Min: {minCommentThreshold}
                    </span>
                </div>
            </div>
        </div>
        
        {filteredThemes.length === 0 ? (
            <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
                <p>No themes match the current filter criteria. Try lowering the threshold.</p>
            </Card>
        ) : (
            <>
                {/* Charts Section (Stacked Full Width) */}
                <div className="flex flex-col gap-6 mb-8">
                    
                    {/* Themes Breakdown */}
                    <Card className="w-full">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center">
                                <BarChart3 className="w-6 h-6 mr-3 text-cyan-500 dark:text-cyan-400" />
                                {barChartTitle}
                            </h3>
                        </div>
                        <div className="p-4">
                            <ThemesSummaryChart themes={filteredThemes} analysisType={analysisType} />
                        </div>
                    </Card>

                    {/* Overall Sentiment - Hide if Theme Only */}
                    {analysisType !== 'theme-only' && (
                        <Card className="w-full">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center">
                                    <PieChart className="w-6 h-6 mr-3 text-cyan-500 dark:text-cyan-400" />
                                    Overall Sentiment
                                </h3>
                            </div>
                            <div className="p-4">
                                <OverallSentimentChart data={overallSentiment} />
                            </div>
                        </Card>
                    )}
                </div>

                {/* Table Section - Hide if Sentiment Only */}
                {analysisType !== 'sentiment-only' && (
                    <Card className="mb-8">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 sm:pl-6">Theme</th>
                                        {analysisType === 'both' && (
                                            <>
                                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-green-600 dark:text-green-500">Positive</th>
                                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-600 dark:text-slate-400">Neutral</th>
                                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-red-600 dark:text-red-500">Negative</th>
                                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-yellow-600 dark:text-yellow-500">Mixed</th>
                                            </>
                                        )}
                                        <th scope="col" className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-200 sm:pr-6">
                                            {analysisType === 'theme-only' ? 'Total Count' : 'Theme Total'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {filteredThemes.map((themeData, index) => {
                                        // Calculate total safely
                                        const themeTotal = themeData.sentiment.positive + themeData.sentiment.neutral + themeData.sentiment.negative + themeData.sentiment.mixed;
                                        return (
                                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-800 dark:text-white sm:pl-6 capitalize">{themeData.theme}</td>
                                                {analysisType === 'both' && (
                                                    <>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 dark:text-green-500 text-right">{themeData.sentiment.positive}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600 dark:text-slate-400 text-right">{themeData.sentiment.neutral}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 dark:text-red-500 text-right">{themeData.sentiment.negative}</td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-yellow-600 dark:text-yellow-500 text-right">{themeData.sentiment.mixed}</td>
                                                    </>
                                                )}
                                                <td className="whitespace-nowrap py-4 pl-3 pr-4 text-sm font-semibold text-slate-800 dark:text-white sm:pr-6 text-right">{themeTotal}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th scope="row" colSpan={analysisType === 'both' ? 5 : 1} className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 sm:pl-6">
                                            Total (Visible)
                                        </th>
                                        <td className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-200 sm:pr-6 text-right">
                                            {filteredThemes.reduce((acc, t) => acc + t.sentiment.positive + t.sentiment.neutral + t.sentiment.negative + t.sentiment.mixed, 0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Detailed Theme Cards - Show only if BOTH */}
                {analysisType === 'both' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredThemes.map((themeData, index) => (
                        <Card key={index} className="flex flex-col">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-white capitalize">{themeData.theme}</h3>
                            </div>
                            <div className="p-4 flex-grow">
                                <ThemeChart sentiment={themeData.sentiment} />
                            </div>
                        </Card>
                    ))}
                    </div>
                )}
            </>
        )}
      </div>

      {/* Insights Section */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100 flex items-center transition-colors duration-200">
            <Lightbulb className="w-8 h-8 mr-3 text-cyan-500 dark:text-cyan-400" />
            Actionable Insights & Recommendations
        </h2>
        <div className="space-y-6">
          {result.insights.map((item, index) => (
            <Card key={index} className="hover:border-cyan-500/50 transition-colors duration-300">
              <div className="p-6">
                
                {/* Category Tag */}
                {item.relatedTheme && (
                    <div className="flex justify-end mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300">
                            <Tag className="w-3 h-3 mr-1" />
                            {item.relatedTheme}
                        </span>
                    </div>
                )}

                {/* Insight */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-full p-2">
                    <Lightbulb className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Insight</h4>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{item.insight}</p>
                  </div>
                </div>

                {/* Recommendation */}
                 <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 rounded-full p-2">
                    <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recommendation</h4>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{item.recommendation}</p>
                  </div>
                </div>

                {/* Quotes / Evidence */}
                {item.quotes && item.quotes.length > 0 && (
                    <div className="flex items-start gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex-shrink-0 bg-white dark:bg-slate-600 rounded-full p-2 shadow-sm">
                            <Quote className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        </div>
                        <div>
                             <h4 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">Voice of the Customer</h4>
                             <ul className="space-y-2">
                                {item.quotes.map((quote, qIndex) => (
                                    <li key={qIndex} className="text-sm text-slate-600 dark:text-slate-300 italic">
                                        "{quote}"
                                    </li>
                                ))}
                             </ul>
                        </div>
                    </div>
                )}

              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
