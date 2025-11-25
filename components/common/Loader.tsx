
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 transition-colors duration-200">
      <div className="w-12 h-12 border-4 border-cyan-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Analyzing feedback... This may take a moment.</p>
    </div>
  );
};
