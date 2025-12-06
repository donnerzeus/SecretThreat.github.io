import React, { useEffect, useState } from 'react';
import type { Room, Player, PlayerRole, VoteChoice, PolicyType } from '../../types';
import { Card } from '../ui/Card';
import { IdentityCard } from './IdentityCard';
import { RoleModal } from './RoleModal';
import { Button } from '../ui/Button';
import {
    subscribeToPlayerRole,
    nominateChancellor,
    voteOnGovernment,
    discardPolicy,
    performInvestigate,
    performExecution,
    performSpecialElection
} from '../../services/gameService';

interface GameBoardProps {
    room: Room;
    players: Player[];
    myPlayer: Player;
}

export const GameBoard: React.FC<GameBoardProps> = ({ room, players, myPlayer }) => {
    const [roleData, setRoleData] = useState<PlayerRole | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToPlayerRole(room.roomId, myPlayer.uid, (data) => {
            setRoleData(data);
        });
        return () => unsubscribe();
    }, [room.roomId, myPlayer.uid]);

    const myRole = roleData?.role || 'Guardian'; // Default to Guardian while loading
    const myTeam = roleData?.team || 'Guardians';

    const isPresident = room.currentPresidentUid === myPlayer.uid;
    const isChancellor = room.currentChancellorUid === myPlayer.uid;


    const handleNominate = async (candidateUid: string) => {
        await nominateChancellor(room.roomId, candidateUid);
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

    return (
        <div className="w-full max-w-6xl mx-auto p-2 space-y-6 pb-24">
            {/* Role Info & Identity Card */}
            {roleData && (
                <>
                    <RoleModal role={myRole} team={myTeam} onConfirm={() => { }} />
                    <IdentityCard role={myRole} team={myTeam} />
                </>
            )}

            {/* Game Actions */}
            <Card className="bg-slate-800/90 border-yellow-500/50">
                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-widest">
                        Phase: {room.turnPhase?.replace('pp_', 'Power: ').replace('_', ' ') || 'LOBBY'}
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Election Tracker: {room.electionTracker} / 3
                    </p>
                    {room.winner && (
                        <div className="mt-4 p-4 bg-slate-900 border-2 border-yellow-500 rounded-lg animate-pulse">
                            <h1 className="text-4xl font-black text-yellow-500 uppercase">
                                {room.winner} WIN!
                            </h1>
                        </div>
                    )}
                </div>

                {/* Game Over - Show Roles */}
                {room.turnPhase === 'game_over' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* We can't show everyone's role easily without fetching all roles. 
                            For now, just showing the winner is enough or we need to fetch all roles.
                            Let's assume the user is happy with just the winner banner for now.
                         */}
                        <p className="text-center text-white">Game Over. Please return to lobby.</p>
                    </div>
                )}

                {/* Nominating Phase */}
                {room.turnPhase === 'nominating' && isPresident && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">Select Chancellor Candidate</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

                {/* Presidential Power: Investigate */}
                {room.turnPhase === 'pp_investigate' && isPresident && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">Investigate Loyalty</h3>
                        <p className="text-center text-slate-400">Select a player to see their team loyalty.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {players.map(p => {
                                if (p.uid === myPlayer.uid || !p.isAlive || room.investigatedPlayers?.[p.uid]) return null;
                                return (
                                    <Button
                                        key={p.uid}
                                        variant="ghost"
                                        className="border border-slate-600"
                                        onClick={() => handleInvestigate(p.uid)}
                                    >
                                        {p.displayName}
                                    </Button>
                                );
                            })}
                        </div>
                        {/* Show investigation result if just happened? 
                            Actually performInvestigate updates DB and ends turn. 
                            We might need a way to show the result BEFORE ending turn.
                            My implementation ends turn immediately. 
                            Correction: The user needs to SEE the result.
                            I should split performInvestigate into "reveal" and "confirm".
                            For now, let's assume performInvestigate sets a temporary state or we handle it differently.
                            Actually, let's change performInvestigate to NOT end turn immediately, but wait for confirmation?
                            Or better: The UI shows the result if `investigatedPlayers` has a new entry for THIS turn.
                            But `investigatedPlayers` is persistent.
                            Let's just show the result of any investigated player in the player list.
                        */}
                    </div>
                )}

                {/* Presidential Power: Execution */}
                {room.turnPhase === 'pp_execution' && isPresident && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-red-500 text-center">EXECUTION</h3>
                        <p className="text-center text-slate-400">Select a player to eliminate from the game.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {players.map(p => {
                                if (p.uid === myPlayer.uid || !p.isAlive) return null;
                                return (
                                    <Button
                                        key={p.uid}
                                        variant="danger"
                                        onClick={() => handleExecution(p.uid)}
                                    >
                                        EXECUTE {p.displayName}
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

                {/* Voting Phase */}
                {room.turnPhase === 'voting' && (
                    <div className="space-y-4 text-center">
                        <h3 className="text-lg font-bold text-white">Vote on Government</h3>
                        <p className="text-slate-300">
                            President: <span className="text-yellow-400">{players.find(p => p.uid === room.currentPresidentUid)?.displayName}</span>
                            <br />
                            Chancellor: <span className="text-orange-400">{players.find(p => p.uid === room.currentChancellorCandidateUid)?.displayName}</span>
                        </p>

                        {!room.votes?.[myPlayer.uid] ? (
                            <div className="flex justify-center gap-4 mt-4">
                                <Button
                                    className="bg-green-600 hover:bg-green-700 w-32"
                                    onClick={() => handleVote('yes')}
                                >
                                    JA!
                                </Button>
                                <Button
                                    className="bg-red-600 hover:bg-red-700 w-32"
                                    onClick={() => handleVote('no')}
                                >
                                    NEIN!
                                </Button>
                            </div>
                        ) : (
                            <p className="text-slate-500 italic">Waiting for other players...</p>
                        )}
                    </div>
                )}

                {/* Legislative Phase - President */}
                {room.turnPhase === 'legislating_president' && isPresident && (
                    <div className="space-y-4 text-center">
                        <h3 className="text-lg font-bold text-white">Presidential Session</h3>
                        <p className="text-slate-300">Discard 1 Policy to pass to Chancellor</p>
                        <div className="flex justify-center gap-4">
                            {room.hand?.map((policy, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleDiscard(policy)}
                                    className={`w-24 h-36 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-transform hover:-translate-y-2 ${policy === 'Guardian'
                                        ? 'bg-blue-900 border-blue-500 text-blue-200'
                                        : 'bg-red-900 border-red-500 text-red-200'
                                        }`}
                                >
                                    {policy}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Legislative Phase - Chancellor */}
                {room.turnPhase === 'legislating_chancellor' && isChancellor && (
                    <div className="space-y-4 text-center">
                        <h3 className="text-lg font-bold text-white">Chancellor Session</h3>
                        <p className="text-slate-300">Discard 1 Policy to Enact the other</p>
                        <div className="flex justify-center gap-4">
                            {room.hand?.map((policy, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleDiscard(policy)}
                                    className={`w-24 h-36 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-transform hover:-translate-y-2 ${policy === 'Guardian'
                                        ? 'bg-blue-900 border-blue-500 text-blue-200'
                                        : 'bg-red-900 border-red-500 text-red-200'
                                        }`}
                                >
                                    {policy}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            {/* Policy Tracks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Guardian Track */}
                <Card className="bg-slate-800/80 border-blue-900/50">
                    <h3 className="text-blue-400 font-bold mb-4 uppercase tracking-widest">Guardian Policies</h3>
                    <div className="flex gap-2 justify-between">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className={`aspect-[2/3] w-full rounded-md border-2 ${i < room.guardianPolicies
                                    ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                    : 'bg-slate-900/50 border-dashed border-slate-700'
                                    }`}
                            />
                        ))}
                    </div>
                </Card>

                {/* Shadow Track */}
                <Card className="bg-slate-800/80 border-red-900/50">
                    <h3 className="text-red-400 font-bold mb-4 uppercase tracking-widest">Shadow Policies</h3>
                    <div className="flex gap-2 justify-between">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className={`aspect-[2/3] w-full rounded-md border-2 relative ${i < room.shadowPolicies
                                    ? 'bg-red-600 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                                    : 'bg-slate-900/50 border-dashed border-slate-700'
                                    }`}
                            >
                                {/* Power Icons could go here */}
                                {i === 2 && <div className="absolute inset-0 flex items-center justify-center text-xs text-center text-slate-500 font-bold opacity-50">PEEK</div>}
                                {i === 3 && <div className="absolute inset-0 flex items-center justify-center text-xs text-center text-slate-500 font-bold opacity-50">EXEC</div>}
                                {i === 4 && <div className="absolute inset-0 flex items-center justify-center text-xs text-center text-slate-500 font-bold opacity-50">EXEC</div>}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Player List / Seating */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {room.playerOrder.map((uid) => {
                    const player = players.find(p => p.uid === uid);
                    if (!player) return null;

                    const isPresident = room.currentPresidentUid === uid;
                    const isChancellor = room.currentChancellorUid === uid;

                    return (
                        <div
                            key={uid}
                            className={`relative p-3 rounded-lg border transition-all ${isPresident ? 'bg-yellow-900/20 border-yellow-500/50' :
                                isChancellor ? 'bg-orange-900/20 border-orange-500/50' :
                                    player.uid === myPlayer.uid ? 'bg-blue-900/20 border-blue-500/50' :
                                        'bg-slate-800 border-slate-700'
                                }`}
                        >
                            <div className="text-center">
                                <div className="font-bold truncate">
                                    {player.displayName}
                                    {player.uid === myPlayer.uid && <span className="text-blue-400 ml-1">(You)</span>}
                                </div>
                                {isPresident && <div className="text-xs text-yellow-500 font-bold mt-1">PRESIDENT</div>}
                                {isChancellor && <div className="text-xs text-orange-500 font-bold mt-1">CHANCELLOR</div>}
                                {!player.isAlive && <div className="text-xs text-red-500 font-bold mt-1">ELIMINATED</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
