
import React, { useRef, useState } from 'react';
import { Card } from './common/Card';
import { Square, FileSpreadsheet, Settings2 } from 'lucide-react';
import { read, utils } from 'xlsx';

interface SurveyInputProps {
  value: string;
  onTextChange: (text: string) => void;
  question: string;
  onQuestionChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  onStop?: () => void;
  isLoading: boolean;
  analysisType?: 'both' | 'theme-only' | 'sentiment-only';
  onAnalysisTypeChange?: (type: 'both' | 'theme-only' | 'sentiment-only') => void;
}

const placeholderText = `Example:
The new onboarding process is much smoother.
I wish there was more communication from management.
The coffee in the breakroom is terrible.
Sometimes the wifi is slow, but the new chairs are comfortable.
...
`;

export const SurveyInput: React.FC<SurveyInputProps> = ({ 
  value, 
  onTextChange, 
  question, 
  onQuestionChange, 
  onAnalyze, 
  onStop, 
  isLoading,
  analysisType = 'both',
  onAnalysisTypeChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert sheet to JSON array of arrays (header: 1)
      const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Flatten the array and filter out empty values, then join with newlines
      const text = jsonData
        .flat()
        .filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
        .join('\n');

      if (text) {
        // Append to existing text if present, otherwise replace
        const newText = value ? `${value}\n\n${text}` : text;
        onTextChange(newText);
      } else {
        alert("No text content found in the uploaded file.");
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Failed to parse the file. Please ensure it is a valid Excel or CSV file.");
    } finally {
      setIsProcessingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card>
      <div className="p-6 space-y-4">
        <div>
          <label htmlFor="survey-question" className="block text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
            Survey Question or Context (Optional)
          </label>
          <input
            id="survey-question"
            type="text"
            value={question}
            onChange={onQuestionChange}
            disabled={isLoading}
            placeholder="e.g., What did you like most about the new feature?"
            className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
          />
        </div>

        <div>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="survey-comments" className="block text-lg font-medium text-slate-700 dark:text-slate-300">
                Paste Survey Comments
                </label>
                <div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".csv, .xlsx, .xls" 
                        className="hidden" 
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isProcessingFile}
                        className="flex items-center px-3 py-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        {isProcessingFile ? 'Importing...' : 'Import File (CSV/Excel)'}
                    </button>
                </div>
            </div>
            <textarea
            id="survey-comments"
            value={value}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={isLoading || isProcessingFile}
            placeholder={placeholderText}
            className="w-full h-64 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
            />
        </div>
        
        <div className="mt-4 flex flex-col md:flex-row justify-end items-center gap-4">
          {onAnalysisTypeChange && (
             <div className="flex flex-col w-full md:w-auto">
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Analysis Type</label>
                 <div className="relative w-full md:w-auto">
                    <select
                        value={analysisType}
                        onChange={(e) => onAnalysisTypeChange(e.target.value as 'both' | 'theme-only' | 'sentiment-only')}
                        disabled={isLoading}
                        className="appearance-none w-full md:w-56 pl-10 pr-8 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <option value="both">Themes & Sentiment</option>
                        <option value="theme-only">Themes Only</option>
                        <option value="sentiment-only">Sentiment Only</option>
                    </select>
                    <Settings2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
             </div>
          )}
          
          <div className="flex gap-4 w-full md:w-auto md:self-end">
             <button
                onClick={onAnalyze}
                disabled={isLoading || isProcessingFile}
                className="flex-grow md:flex-grow-0 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none whitespace-nowrap"
            >
                {isLoading ? 'Analyzing...' : 'Analyze Comments'}
            </button>
            
            {onStop && (
                <button
                onClick={onStop}
                disabled={!isLoading}
                className={`flex items-center justify-center px-6 py-3 font-semibold rounded-lg shadow-lg transition-all duration-300 whitespace-nowrap ${
                    isLoading
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:shadow-red-500/50 transform hover:-translate-y-0.5'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75 shadow-none'
                }`}
                >
                <Square className="w-4 h-4 mr-2 fill-current" />
                STOP
                </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
