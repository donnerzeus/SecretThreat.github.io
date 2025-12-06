import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Room, Player, PlayerRole, VoteChoice, PolicyType } from '../../types';
import { Card } from '../ui/Card';
import { IdentityCard } from './IdentityCard';
import { RoleModal } from './RoleModal';
import { Button } from '../ui/Button';
import {
    subscribeToPlayerRole,
    subscribeToAllPlayerRoles,
    nominateChancellor,
    voteOnGovernment,
    processVotingResults,
    discardPolicy,
    performInvestigate,
    performExecution,
    performSpecialElection,
    endPeek,
    requestVeto,
    respondToVeto
} from '../../services/gameService';
import { ActionLog } from './ActionLog';

interface GameBoardProps {
    room: Room;
    players: Player[];
    myPlayer: Player;
}

export const GameBoard: React.FC<GameBoardProps> = ({ room, players, myPlayer }) => {
    const navigate = useNavigate();
    const [roleData, setRoleData] = useState<PlayerRole | null>(null);
    const [allRoles, setAllRoles] = useState<Record<string, PlayerRole> | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToPlayerRole(room.roomId, myPlayer.uid, (data) => {
            setRoleData(data);
        });
        return () => unsubscribe();
    }, [room.roomId, myPlayer.uid]);

    useEffect(() => {
        if (room.turnPhase === 'game_over') {
            const unsubscribe = subscribeToAllPlayerRoles(room.roomId, (data) => {
                setAllRoles(data);
            });
            return () => unsubscribe();
        }
    }, [room.roomId, room.turnPhase]);

    const myRole = roleData?.role || 'Guardian'; // Default to Guardian while loading
    const myTeam = roleData?.team || 'Guardians';

    // Intel Logic
    const [intel, setIntel] = useState<{ teammates: string[], secretThreatName?: string }>({ teammates: [] });

    useEffect(() => {
        if (!roleData || roleData.role === 'Guardian') return;

        const unsubscribe = subscribeToAllPlayerRoles(room.roomId, (allRoles) => {
            const newIntel: { teammates: string[], secretThreatName?: string } = { teammates: [] };
            const playerCount = players.length;

            if (roleData.role === 'Shadow') {
                // Shadows always know Secret Threat and other Shadows
                const shadows: string[] = [];
                Object.values(allRoles).forEach(r => {
                    const p = players.find(pl => pl.uid === r.uid);
                    if (!p) return;

                    if (r.role === 'SecretThreat') {
                        newIntel.secretThreatName = p.displayName;
                    } else if (r.role === 'Shadow' && r.uid !== myPlayer.uid) {
                        shadows.push(p.displayName);
                    }
                });
                newIntel.teammates = shadows;
            } else if (roleData.role === 'SecretThreat') {
                // Secret Threat knows Shadows ONLY if player count <= 6
                if (playerCount <= 6) {
                    const shadows: string[] = [];
                    Object.values(allRoles).forEach(r => {
                        const p = players.find(pl => pl.uid === r.uid);
                        if (!p) return;

                        if (r.role === 'Shadow') {
                            shadows.push(p.displayName);
                        }
                    });
                    newIntel.teammates = shadows;
                }
            }
            setIntel(newIntel);
        });

        return () => unsubscribe();
    }, [room.roomId, roleData?.role, players.length]);

    const isPresident = room.currentPresidentUid === myPlayer.uid;
    const isChancellor = room.currentChancellorUid === myPlayer.uid;



    const handleNominate = async (candidateUid: string) => {
        const candidate = players.find(p => p.uid === candidateUid);
        if (candidate) {
            await nominateChancellor(room.roomId, candidateUid, candidate.displayName);
        }
    };

    const handleVote = async (vote: VoteChoice) => {
        await voteOnGovernment(room.roomId, myPlayer.uid, vote);
    };

    const handleDiscard = async (policy: PolicyType) => {
        await discardPolicy(room.roomId, policy);
    };

    const handleInvestigate = async (targetUid: string) => {
        await performInvestigate(room.roomId, targetUid);
    };

    const handleExecution = async (targetUid: string) => {
        if (confirm('Are you sure you want to EXECUTE this player? This cannot be undone.')) {
            await performExecution(room.roomId, targetUid);
        }
    };

    const handleSpecialElection = async (targetUid: string) => {
        await performSpecialElection(room.roomId, targetUid);
    };

    const handleEndPeek = async () => {
        await endPeek(room.roomId);
    };

    const handleRequestVeto = async () => {
        await requestVeto(room.roomId);
    };

    const handleRespondVeto = async (approved: boolean) => {
        await respondToVeto(room.roomId, approved);
    };

    if (room.turnPhase === 'game_over') {
        return (
            <div className="w-full max-w-4xl mx-auto p-4 space-y-8">
                <Card className="bg-slate-900/90 border-yellow-500/50 text-center p-8">
                    <h1 className="text-5xl font-black text-yellow-500 uppercase mb-4 animate-pulse">
                        {room.winner} WIN!
                    </h1>
                    <p className="text-slate-400 mb-8">The game has ended.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Mission Report</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-blue-400">Guardian Policies:</span>
                                    <span className="font-bold text-white">{room.guardianPolicies}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-red-400">Shadow Policies:</span>
                                    <span className="font-bold text-white">{room.shadowPolicies}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Operative Identities</h3>
                            <div className="space-y-3">
                                {players.map(p => {
                                    const role = allRoles?.[p.uid];
                                    return (
                                        <div key={p.uid} className="flex items-center justify-between bg-slate-800 p-2 rounded">
                                            <span className="font-medium text-white">{p.displayName}</span>
                                            {role ? (
                                                <span className={`text-sm font-bold px-2 py-1 rounded ${role.role === 'SecretThreat' ? 'bg-red-900 text-red-200' :
                                                    role.team === 'Shadows' ? 'bg-red-900/50 text-red-300' :
                                                        'bg-blue-900/50 text-blue-300'
                                                    }`}>
                                                    {role.role === 'SecretThreat' ? 'SECRET THREAT' : role.role.toUpperCase()}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-xs">Revealing...</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-12">
                        <Button onClick={() => navigate('/lobby')} size="lg" className="w-full md:w-auto px-12">
                            Return to Lobby
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-2 space-y-6 pb-24">
            {/* Role Info & Identity Card */}
            {roleData && (
                <>
                    <RoleModal
                        role={myRole}
                        team={myTeam}
                        teammates={intel.teammates}
                        secretThreatName={intel.secretThreatName}
                        onConfirm={() => { }}
                    />
                    <IdentityCard role={myRole} team={myTeam} />
                </>
            )}

            {/* Game Info Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center p-2">
                    <div className="text-xs text-slate-400 uppercase">Election Tracker</div>
                    <div className="flex justify-center gap-1 mt-1">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i < room.electionTracker ? 'bg-red-500' : 'bg-slate-700'}`} />
                        ))}
                    </div>
                </Card>
                <Card className="text-center p-2">
                    <div className="text-xs text-slate-400 uppercase">Deck</div>
                    <div className="font-bold text-xl">{room.policyDeck?.length || 0}</div>
                </Card>
                <Card className="text-center p-2">
                    <div className="text-xs text-slate-400 uppercase">Discard</div>
                    <div className="font-bold text-xl">{room.policyDiscard?.length || 0}</div>
                </Card>
                <Card className="text-center p-2">
                    <div className="text-xs text-slate-400 uppercase">Veto Power</div>
                    <div className={`font-bold ${room.vetoPowerUnlocked ? 'text-green-400' : 'text-slate-600'}`}>
                        {room.vetoPowerUnlocked ? 'UNLOCKED' : 'LOCKED'}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Board Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Policy Tracks */}
                    <div className="space-y-4">
                        {/* Guardian Track */}
                        <div className="relative bg-slate-800 rounded-lg p-4 border-2 border-blue-900/50">
                            <h3 className="text-blue-400 font-bold mb-2 uppercase tracking-widest">Guardian Policies</h3>
                            <div className="flex gap-2 justify-between">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`
                                        flex-1 aspect-[2/3] rounded border-2 flex items-center justify-center
                                        ${i <= room.guardianPolicies
                                            ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
                                            : 'bg-slate-900/50 border-slate-700 border-dashed'}
                                    `}>
                                        {i <= room.guardianPolicies && <Shield className="w-8 h-8 text-white" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shadow Track */}
                        <div className="relative bg-slate-800 rounded-lg p-4 border-2 border-red-900/50">
                            <h3 className="text-red-400 font-bold mb-2 uppercase tracking-widest">Shadow Policies</h3>
                            <div className="flex gap-2 justify-between">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className={`
                                        flex-1 aspect-[2/3] rounded border-2 flex items-center justify-center relative
                                        ${i <= room.shadowPolicies
                                            ? 'bg-red-700 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                                            : 'bg-slate-900/50 border-slate-700 border-dashed'}
                                    `}>
                                        {i <= room.shadowPolicies && <Skull className="w-6 h-6 text-white" />}

                                        {/* Power Indicators */}
                                        {i === 2 && <div className="absolute -bottom-6 text-[10px] text-slate-400 text-center w-full">Investigate</div>}
                                        {i === 3 && <div className="absolute -bottom-6 text-[10px] text-slate-400 text-center w-full">Peek</div>}
                                        {i === 4 && <div className="absolute -bottom-6 text-[10px] text-slate-400 text-center w-full">Exec + Veto</div>}
                                        {i === 5 && <div className="absolute -bottom-6 text-[10px] text-slate-400 text-center w-full">Exec</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Area */}
                    <Card className="min-h-[200px] flex flex-col items-center justify-center p-8 border-yellow-500/20">
                        <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-widest">
                            {room.turnPhase?.replace('_', ' ')}
                        </h2>

                        {/* Veto Request UI */}
                        {room.turnPhase === 'legislating_chancellor' && isChancellor && room.vetoPowerUnlocked && (
                            <div className="mb-4">
                                <Button variant="danger" onClick={handleRequestVeto} className="animate-pulse">
                                    Request Veto
                                </Button>
                                <p className="text-xs text-slate-400 mt-2">Ask President to discard all cards.</p>
                            </div>
                        )}

                        {/* Veto Response UI */}
                        {room.turnPhase === 'veto_requested' && (
                            <div className="text-center">
                                {isPresident ? (
                                    <div className="space-y-4">
                                        <p className="text-lg text-yellow-400">Chancellor requested a Veto!</p>
                                        <p className="text-slate-400">Do you agree to discard all current policies?</p>
                                        <div className="flex gap-4 justify-center">
                                            <Button onClick={() => handleRespondVeto(true)} variant="primary">
                                                Approve Veto
                                            </Button>
                                            <Button onClick={() => handleRespondVeto(false)} variant="danger">
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 animate-pulse">President is deciding on Veto...</p>
                                )}
                            </div>
                        )}

                        {/* Nominating Phase */}
                        {room.turnPhase === 'nominating' && isPresident && (
                            <div className="space-y-4 w-full max-w-md">
                                <p className="text-center text-slate-400">Nominate a Chancellor Candidate</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {players.map(p => {
                                        if (p.uid === myPlayer.uid || !p.isAlive) return null;
                                        return (
                                            <Button
                                                key={p.uid}
                                                variant="secondary"
                                                onClick={() => handleNominate(p.uid)}
                                            >
                                                {p.displayName}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Voting Phase */}
                        {room.turnPhase === 'voting' && (
                            <div className="space-y-4 text-center">
                                <p className="text-lg">Vote for Chancellor: <span className="font-bold text-yellow-500">
                                    {players.find(p => p.uid === room.currentChancellorCandidateUid)?.displayName}
                                </span></p>
                                <div className="flex gap-4 justify-center">
                                    <Button onClick={() => handleVote('yes')} className="bg-blue-600 hover:bg-blue-700 w-32">
                                        JA! (Yes)
                                    </Button>
                                    <Button onClick={() => handleVote('no')} className="bg-red-600 hover:bg-red-700 w-32">
                                        NEIN! (No)
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Voting Results Phase */}
                        {room.turnPhase === 'voting_results' && (
                            <div className="space-y-6 text-center w-full">
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-4">Voting Results</h3>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 justify-items-center">
                                    {players.map((p, index) => {
                                        const vote = room.votes?.[p.uid];
                                        if (!p.isAlive) return null;

                                        return (
                                            <div key={p.uid} className="flex flex-col items-center gap-2">
                                                <div className="font-bold text-white text-xs">{p.displayName}</div>
                                                <motion.div
                                                    initial={{ rotateY: 180, opacity: 0 }}
                                                    animate={{ rotateY: 0, opacity: 1 }}
                                                    transition={{ delay: index * 0.3, duration: 0.5 }}
                                                    className={`w-20 h-28 rounded-lg border-4 flex items-center justify-center font-black text-xl shadow-xl ${vote === 'yes' ? 'bg-blue-600 border-blue-400 text-white' :
                                                            vote === 'no' ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-700'
                                                        }`}
                                                >
                                                    {vote === 'yes' ? 'JA!' : 'NEIN!'}
                                                </motion.div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {isPresident && (
                                    <Button onClick={() => processVotingResults(room.roomId)} className="mt-8 animate-pulse" size="lg">
                                        Proceed
                                    </Button>
                                )}
                                {!isPresident && (
                                    <p className="text-slate-400 mt-4 animate-pulse">Waiting for President to proceed...</p>
                                )}
                            </div>
                        )}

                        {/* Legislating Phase */}
                        {(room.turnPhase === 'legislating_president' || room.turnPhase === 'legislating_chancellor') && (
                            <div className="space-y-4 text-center">
                                {((room.turnPhase === 'legislating_president' && isPresident) ||
                                    (room.turnPhase === 'legislating_chancellor' && isChancellor)) ? (
                                    <>
                                        <p className="text-slate-300 mb-4">
                                            {room.turnPhase === 'legislating_president'
                                                ? "Select 1 policy to DISCARD (Pass 2 to Chancellor)"
                                                : "Select 1 policy to DISCARD (Enact the other)"}
                                        </p>
                                        <div className="flex justify-center gap-4">
                                            {room.hand?.map((policy, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleDiscard(policy)}
                                                    className={`
                                                        w-32 h-48 rounded-xl border-4 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center font-bold text-xl shadow-2xl
                                                        ${policy === 'Guardian'
                                                            ? 'bg-blue-900 border-blue-500 text-blue-200'
                                                            : 'bg-red-900 border-red-500 text-red-200'}
                                                    `}
                                                >
                                                    {policy}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-slate-400 animate-pulse">
                                        Waiting for {room.turnPhase === 'legislating_president' ? 'President' : 'Chancellor'} to legislate...
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Presidential Power: Investigate */}
                        {room.turnPhase === 'pp_investigate' && isPresident && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white text-center">Investigate Loyalty</h3>
                                <p className="text-center text-slate-400">Choose a player to investigate their team affiliation.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {players.map(p => {
                                        if (p.uid === myPlayer.uid || !p.isAlive) return null;
                                        return (
                                            <Button
                                                key={p.uid}
                                                variant="secondary"
                                                onClick={() => handleInvestigate(p.uid)}
                                            >
                                                {p.displayName}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Presidential Power: Execution */}
                        {room.turnPhase === 'pp_execution' && isPresident && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-red-500 text-center uppercase">Execution</h3>
                                <p className="text-center text-slate-400">Choose a player to eliminate from the game.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {players.map(p => {
                                        if (p.uid === myPlayer.uid || !p.isAlive) return null;
                                        return (
                                            <Button
                                                key={p.uid}
                                                variant="danger"
                                                onClick={() => handleExecution(p.uid)}
                                            >
                                                {p.displayName}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Presidential Power: Special Election */}
                        {room.turnPhase === 'pp_special_election' && isPresident && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white text-center">Special Election</h3>
                                <p className="text-center text-slate-400">Choose the next President.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {players.map(p => {
                                        if (p.uid === myPlayer.uid || !p.isAlive) return null;
                                        return (
                                            <Button
                                                key={p.uid}
                                                variant="secondary"
                                                onClick={() => handleSpecialElection(p.uid)}
                                            >
                                                {p.displayName}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Presidential Power: Peek */}
                        {room.turnPhase === 'pp_peek' && isPresident && (
                            <div className="space-y-4 text-center">
                                <h3 className="text-lg font-bold text-white">Policy Peek</h3>
                                <p className="text-slate-300">Top 3 policies in the deck (Private):</p>
                                <div className="flex justify-center gap-4">
                                    {room.policyDeck?.slice(0, 3).map((policy, idx) => (
                                        <div
                                            key={idx}
                                            className={`w-24 h-36 rounded-lg border-2 flex items-center justify-center font-bold text-sm ${policy === 'Guardian'
                                                ? 'bg-blue-900 border-blue-500 text-blue-200'
                                                : 'bg-red-900 border-red-500 text-red-200'
                                                }`}
                                        >
                                            {policy}
                                        </div>
                                    ))}
                                </div>
                                <Button onClick={handleEndPeek} className="w-full mt-4">
                                    End Peek
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar: Players & Logs */}
                <div className="space-y-6">
                    {/* Players List */}
                    <Card className="p-4">
                        <h3 className="text-slate-400 uppercase text-xs font-bold mb-4">Players</h3>
                        <div className="space-y-2">
                            {players.map((p) => (
                                <div key={p.uid} className={`flex items-center justify-between p-2 rounded ${!p.isAlive ? 'bg-red-900/20 opacity-50' : 'bg-slate-800'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${p.isAlive ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className={p.uid === myPlayer.uid ? 'text-yellow-400 font-bold' : 'text-white'}>
                                            {p.displayName} {p.uid === myPlayer.uid && '(You)'}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        {room.currentPresidentUid === p.uid && <span className="text-[10px] bg-blue-600 px-1 rounded text-white">PRES</span>}
                                        {room.currentChancellorUid === p.uid && <span className="text-[10px] bg-orange-600 px-1 rounded text-white">CHAN</span>}
                                        {!p.isAlive && <span className="text-[10px] bg-red-900 px-1 rounded text-red-200">DEAD</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Action Log */}
                    <ActionLog logs={room.logs || []} />
                </div>
            </div>
        </div>
    );
};

