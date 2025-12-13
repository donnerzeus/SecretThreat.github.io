import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-background to-background opacity-50 pointer-events-none" />
            <div className="relative z-10 w-full max-w-4xl">
                {children}
            </div>
            <div className="absolute bottom-2 right-2 text-xs text-slate-600 opacity-50">
                v1.1.0
            </div>
        </div>
    );
};
