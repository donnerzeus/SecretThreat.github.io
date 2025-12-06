import React from 'react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
    return (
        <input
            className={cn(
                'w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                className
            )}
            {...props}
        />
    );
};
