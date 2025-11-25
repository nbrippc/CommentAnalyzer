
export interface SentimentCounts {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
}

export interface Theme {
  theme: string;
  sentiment: SentimentCounts;
}

export interface Insight {
  insight: string;
  recommendation: string;
  quotes: string[];
  relatedTheme?: string;
}

export interface CategorizedComment {
  text: string;
  theme: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
}

export interface AnalysisResult {
  surveyQuestion?: string;
  themes: Theme[];
  insights: Insight[];
  comments?: CategorizedComment[];
  analysisType?: 'both' | 'theme-only' | 'sentiment-only';
}

export interface HistoryItem {
  id: number;
  name: string;
  result: AnalysisResult;
}
