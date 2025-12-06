import React from 'react';


interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
    return (
        <div className={`
            bg-slate-900/60 
            backdrop-blur-xl 
            border border-white/10 
            rounded-2xl 
            p-6 
            shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] 
            ring-1 ring-white/5
            transition-all duration-300
            hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]
            hover:border-white/20
            ${className}
        `}>
            {children}
        </div>
    );
};
