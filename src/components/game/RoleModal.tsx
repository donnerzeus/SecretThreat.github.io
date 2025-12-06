import React, { useState } from 'react';
import type { Role, Team } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Shield, Skull, Crown, Eye } from 'lucide-react';

interface RoleModalProps {
    role: Role;
    team: Team;
    teammates?: string[]; // Names of people you know are bad
    secretThreatName?: string; // If you are a Shadow in 5-6 player game
    onConfirm: () => void;
}

export const RoleModal: React.FC<RoleModalProps> = ({ role, team, teammates, secretThreatName, onConfirm }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setIsOpen(false);
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <Card className="max-w-lg w-full border-2 border-slate-600 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold mb-2">CONFIDENTIAL BRIEFING</h2>
                    <p className="text-slate-400">Read carefully. This message will self-destruct.</p>
                </div>

                <div className="flex flex-col items-center mb-8">
                    {role === 'Guardian' && <Shield className="w-24 h-24 text-blue-500 mb-4" />}
                    {role === 'Shadow' && <Skull className="w-24 h-24 text-red-500 mb-4" />}
                    {role === 'SecretThreat' && <Crown className="w-24 h-24 text-red-500 mb-4" />}

                    <h3 className={`text-2xl font-bold uppercase ${team === 'Guardians' ? 'text-blue-400' : 'text-red-400'}`}>
                        You are {role === 'SecretThreat' ? 'The Secret Threat' : `a ${role}`}
                    </h3>
                    <p className="text-lg text-slate-300 mt-2">
                        Team: <span className={team === 'Guardians' ? 'text-blue-400' : 'text-red-400'}>{team}</span>
                    </p>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg mb-6 text-left">
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Intel
                    </h4>
                    <ul className="space-y-2 text-sm">
                        {role === 'Guardian' && (
                            <li>You have no special intel. Trust no one.</li>
                        )}
                        {role === 'SecretThreat' && (
                            <>
                                {teammates && teammates.length > 0 ? (
                                    <li className="text-red-300">Your Minions (Shadows): {teammates.join(', ')}</li>
                                ) : (
                                    <li>You do not know who your fellow Shadows are. Play along.</li>
                                )}
                            </>
                        )}
                        {role === 'Shadow' && (
                            <>
                                <li>You are working to install the Secret Threat.</li>
                                {teammates && teammates.length > 0 && (
                                    <li className="text-red-300">Fellow Shadows: {teammates.join(', ')}</li>
                                )}
                                {secretThreatName && (
                                    <li className="text-red-300 font-bold">The Secret Threat is: {secretThreatName}</li>
                                )}
                            </>
                        )}
                    </ul>
                </div>

                <Button onClick={handleConfirm} className="w-full" size="lg" variant="secondary">
                    I Understand My Mission
                </Button>
            </Card>
        </div>
    );
};
