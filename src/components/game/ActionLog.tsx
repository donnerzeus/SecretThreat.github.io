import React, { useEffect, useRef } from 'react';
import type { GameLog } from '../../types';

interface ActionLogProps {
    logs: GameLog[];
}

export const ActionLog: React.FC<ActionLogProps> = ({ logs }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [logs]);

    return (
        <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4 h-48 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Mission Log</h3>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-2 text-sm font-mono scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {logs.length === 0 && <p className="text-slate-600 italic">No activity recorded.</p>}
                {logs.map((log) => (
                    <div key={log.id} className={`
                        p-2 rounded border-l-2 
                        ${log.type === 'info' ? 'border-blue-500 bg-blue-900/20 text-blue-200' : ''}
                        ${log.type === 'success' ? 'border-green-500 bg-green-900/20 text-green-200' : ''}
                        ${log.type === 'danger' ? 'border-red-500 bg-red-900/20 text-red-200' : ''}
                        ${log.type === 'warning' ? 'border-yellow-500 bg-yellow-900/20 text-yellow-200' : ''}
                    `}>
                        <span className="opacity-50 text-[10px] mr-2">
                            {new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
};
