import React from 'react';
import type { Room, Player } from '../../types';
import { Card } from '../ui/Card';
import { IdentityCard } from './IdentityCard';
import { RoleModal } from './RoleModal';

interface GameBoardProps {
    room: Room;
    players: Player[];
    myPlayer: Player;
}

export const GameBoard: React.FC<GameBoardProps> = ({ room, players, myPlayer }) => {
    // Mock role for UI demo since we can't fetch private subcollection easily without auth/rules setup
    const myRole = 'Guardian';
    const myTeam = 'Guardians';

    return (
        <div className="w-full max-w-6xl mx-auto p-2 space-y-6 pb-24">
            {/* Role Info & Identity Card */}
            <RoleModal role={myRole} team={myTeam} onConfirm={() => { }} />
            <IdentityCard role={myRole} team={myTeam} />

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
