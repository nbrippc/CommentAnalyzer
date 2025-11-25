
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SurveyInput } from './components/SurveyInput';
import { AnalysisResults } from './components/AnalysisResults';
import { analyzeSurveyComments } from './services/geminiService';
import type { AnalysisResult, HistoryItem } from './types';
import { HistoryPanel } from './components/HistoryPanel';
import { Sun, Moon } from 'lucide-react';

// pako is loaded from CDN in index.html
declare const pako: any;

// Centralized configuration for the Logo URL
// NOTE: Ensure you have created a 'public' folder in your project directory
// and placed 'Logo_NBRI_unofficial.png' inside it.
const NBRI_LOGO_URL = "/Logo_NBRI_unofficial.png";

function App() {
  const [surveyText, setSurveyText] = useState<string>('');
  const [surveyQuestion, setSurveyQuestion] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<'both' | 'theme-only' | 'sentiment-only'>('both');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle Dark Mode Toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
    } else {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const loadSharedData = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setIsLoading(true);
        try {
          // Restore URL-safe Base64 to standard Base64
          let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }

          const binaryString = atob(base64);
          const charData = binaryString.split('').map(c => c.charCodeAt(0));
          const uint8Array = new Uint8Array(charData);
          const decompressed = pako.inflate(uint8Array, { to: 'string' });
          const parsedResult: AnalysisResult = JSON.parse(decompressed);
          setAnalysisResult(parsedResult);
          setSurveyQuestion(parsedResult.surveyQuestion || '');

          // Clean up URL by removing the hash
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        } catch (e) {
          console.error("Failed to load shared results:", e);
          setError("The shared analysis link is invalid or corrupted.");
        } finally {
            setIsLoading(false);
        }
      }
    };
    loadSharedData();
    
    // Load history from localStorage
    try {
      const storedHistory = localStorage.getItem('surveyAnalysisHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem('surveyAnalysisHistory');
    }
  }, []);


  const handleAnalyze = useCallback(async () => {
    if (!surveyText.trim()) {
      setError('Please enter some survey comments to analyze.');
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeSurveyComments(surveyText, surveyQuestion, abortController.signal, analysisType);
      const resultWithQuestion = { ...result, surveyQuestion };
      setAnalysisResult(resultWithQuestion);

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        name: surveyQuestion ? `Analysis: ${surveyQuestion.substring(0, 20)}...` : `Analysis - ${new Date().toLocaleString()}`,
        result: resultWithQuestion,
      };
      setHistory(prevHistory => {
        const updatedHistory = [newHistoryItem, ...prevHistory].slice(10); // Keep latest 10
        try {
          localStorage.setItem('surveyAnalysisHistory', JSON.stringify(updatedHistory));
        } catch(e) {
          console.error("Failed to save history to localStorage", e);
        }
        return updatedHistory;
      });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Analysis aborted by user');
        return; // Do not set error state for manual aborts
      }
      console.error('Analysis failed:', err);
      setError('Failed to analyze the survey comments. The format might be invalid or there was a network issue. Please try again.');
    } finally {
      // Only reset loading if this is still the active controller
      if (abortControllerRef.current === abortController) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [surveyText, surveyQuestion, analysisType]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleLoadHistory = (resultToLoad: AnalysisResult) => {
    setAnalysisResult(resultToLoad);
    setSurveyQuestion(resultToLoad.surveyQuestion || '');
    setError(null);
    const resultsElement = document.getElementById('analysis-results-section');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('surveyAnalysisHistory');
    } catch (e) {
      console.error("Failed to clear history from localStorage", e);
    }
  };

  return (
    <div className="bg-gray-50 text-slate-900 dark:bg-slate-900 dark:text-slate-200 min-h-screen font-sans transition-colors duration-200">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="relative text-center mb-8 md:mb-12">
          <div className="absolute right-0 top-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-700 dark:from-cyan-400 dark:to-blue-600">
              NBRI Survey Comment Analyzer
            </h1>
          </div>

          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Paste your raw survey comments below to uncover themes, sentiment, and actionable insights powered by Gemini.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <aside className="lg:col-span-3">
             <HistoryPanel 
                history={history} 
                onLoad={handleLoadHistory} 
                onClear={handleClearHistory}
                currentResult={analysisResult}
             />
          </aside>
          
          <main className="lg:col-span-9">
            <div className="max-w-4xl mx-auto">
              <SurveyInput
                value={surveyText}
                onTextChange={setSurveyText}
                question={surveyQuestion}
                onQuestionChange={(e) => setSurveyQuestion(e.target.value)}
                onAnalyze={handleAnalyze}
                onStop={handleStop}
                isLoading={isLoading}
                analysisType={analysisType}
                onAnalysisTypeChange={setAnalysisType}
              />
            </div>
            <div id="analysis-results-section" className="mt-8 md:mt-12">
              <AnalysisResults
                result={analysisResult}
                isLoading={isLoading}
                error={error}
                logoUrl={NBRI_LOGO_URL}
              />
            </div>
          </main>
        </div>

        <footer className="text-center mt-12 text-slate-500 dark:text-slate-500">
          <p>&copy; {new Date().getFullYear()} NBRI Survey Comment Analyzer. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;