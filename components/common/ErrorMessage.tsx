
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center transition-colors duration-200" role="alert">
       <AlertTriangle className="h-6 w-6 mr-3 text-red-500 dark:text-red-400"/>
      <div>
        <p className="font-bold">An Error Occurred</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};
