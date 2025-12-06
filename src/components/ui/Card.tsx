import React from 'react';
import { cn } from './Button';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
    return (
        <div
            className={cn(
                'bg-surface border border-slate-700/50 rounded-xl p-6 shadow-xl backdrop-blur-sm',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
