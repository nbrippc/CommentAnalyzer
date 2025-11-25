
import React, { useState } from 'react';
import type { HistoryItem, AnalysisResult } from '../types';
import { Card } from './common/Card';
import { History, Trash2, Search } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryItem[];
  onLoad: (result: AnalysisResult) => void;
  onClear: () => void;
  currentResult: AnalysisResult | null;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoad, onClear, currentResult }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
            <History className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
            Analysis History
          </h3>
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
              aria-label="Clear all history"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-colors"
          />
        </div>
      </div>
      <div className="p-2 max-h-[500px] overflow-y-auto flex-grow">
        {history.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-500">
            No past analyses found.
          </p>
        ) : filteredHistory.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-500">
            No matching results found.
          </p>
        ) : (
          <ul className="space-y-1">
            {filteredHistory.map((item) => {
              const isSelected = currentResult === item.result;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onLoad(item.result)}
                    className={`w-full text-left p-2 rounded-md transition-colors text-sm ${
                      isSelected
                        ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                       {new Date(item.id).toLocaleDateString()}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};
