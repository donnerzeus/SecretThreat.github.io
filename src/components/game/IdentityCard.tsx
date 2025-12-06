import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Role, Team } from '../../types';
import { cn } from '../ui/Button';
import { Shield, Skull, Crown } from 'lucide-react';

interface IdentityCardProps {
    role: Role;
    team: Team;
}

export const IdentityCard: React.FC<IdentityCardProps> = ({ role, team }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div className="relative mx-auto mb-6 md:fixed md:bottom-4 md:right-4 md:z-50 md:mb-0 flex justify-center md:block">
            <div className="relative w-32 h-48 cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                    className="w-full h-full relative preserve-3d transition-transform duration-500"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                >
                    {/* Back of Card */}
                    <div className="absolute inset-0 backface-hidden bg-slate-800 border-2 border-slate-600 rounded-xl flex flex-col items-center justify-center p-2 shadow-2xl">
                        <div className="w-full h-full border border-slate-600/50 rounded-lg flex items-center justify-center bg-slate-800 opacity-50">
                            <span className="text-xs text-slate-400 font-mono text-center">TOP SECRET<br />TAP TO REVEAL</span>
                        </div>
                    </div>

                    {/* Front of Card */}
                    <div className={cn(
                        "absolute inset-0 backface-hidden rotate-y-180 rounded-xl flex flex-col items-center justify-center p-4 shadow-2xl border-4",
                        team === 'Guardians' ? "bg-blue-900 border-blue-500" : "bg-red-900 border-red-500"
                    )}>
                        <div className="text-center">
                            {role === 'Guardian' && <Shield className="w-12 h-12 text-blue-400 mx-auto mb-2" />}
                            {role === 'Shadow' && <Skull className="w-12 h-12 text-red-400 mx-auto mb-2" />}
                            {role === 'SecretThreat' && <Crown className="w-12 h-12 text-red-400 mx-auto mb-2" />}

                            <h3 className={cn(
                                "text-lg font-bold uppercase mb-1",
                                team === 'Guardians' ? "text-blue-300" : "text-red-300"
                            )}>
                                {role === 'SecretThreat' ? 'Secret Threat' : role}
                            </h3>

                            <p className="text-[10px] leading-tight text-white/70">
                                {team === 'Guardians'
                                    ? "Find and stop the Secret Threat. Pass 5 Guardian policies."
                                    : "Pass 6 Shadow policies or elect the Secret Threat as Chancellor after 3 Shadow policies."}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
