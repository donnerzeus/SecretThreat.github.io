import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToRoom, subscribeToPlayers, startGame } from '../services/gameService';
import type { Room, Player } from '../types';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { GameBoard } from '../components/game/GameBoard';
import { Users, Copy, Play, Loader2 } from 'lucide-react';
import { useGameSounds } from '../hooks/useGameSounds';

const GameLobby: React.FC<{ room: Room; players: Player[]; isHost: boolean }> = ({ room, players, isHost }) => {
    const copyCode = () => {
        navigator.clipboard.writeText(room.roomId);
        // Could add toast here
    };

    const handleStart = async () => {
        if (players.length < room.minPlayers) {
            alert(`Need at least ${room.minPlayers} players to start.`);
            return;
        }
        try {
            await startGame(room.roomId);
        } catch (e) {
            console.error(e);
            alert('Failed to start game');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <h2 className="text-2xl text-slate-400">Operation Lobby</h2>
                <div className="flex items-center justify-center gap-4">
                    <div className="text-6xl font-mono font-bold tracking-wider text-blue-500">{room.roomId}</div>
                    <Button variant="ghost" size="sm" onClick={copyCode}>
                        <Copy className="w-5 h-5" />
                    </Button>
                </div>
                <p className="text-slate-500">Share this code with your fellow agents.</p>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Agents ({players.length}/{room.maxPlayers})
                    </h3>
                    {isHost && (
                        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                            You are the Host
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {players.map((p) => (
                        <div
                            key={p.uid}
                            className="flex items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mr-3 font-bold text-slate-300">
                                {p.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{p.displayName}</span>
                            {p.isHost && <span className="ml-auto text-xs text-yellow-500">HOST</span>}
                        </div>
                    ))}
                    {Array.from({ length: Math.max(0, room.minPlayers - players.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="p-3 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-600">
                            Waiting for agent...
                        </div>
                    ))}
                </div>
            </Card>

            {isHost ? (
                <Button
                    className="w-full py-4 text-xl"
                    disabled={players.length < room.minPlayers}
                    onClick={handleStart}
                >
                    <Play className="w-6 h-6 mr-2" />
                    Initialize Operation
                </Button>
            ) : (
                <div className="text-center text-slate-500 animate-pulse">
                    Waiting for host to initiate operation...
                </div>
            )}
        </div>
    );
};

export const GameRoom: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [room, setRoom] = useState<Room | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);

    useGameSounds(room);

    useEffect(() => {
        if (!roomId) return;

        const unsubscribeRoom = subscribeToRoom(roomId, (roomData) => {
            if (!roomData) {
                // Room doesn't exist or deleted
                navigate('/lobby');
                return;
            }
            setRoom(roomData);
        });

        const unsubscribePlayers = subscribeToPlayers(roomId, (playersData) => {
            setPlayers(playersData);
        });

        return () => {
            unsubscribeRoom();
            unsubscribePlayers();
        };
    }, [roomId, navigate]);

    if (!room || !players.length) {
        return (
            <Layout>
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Loading Operation...</h2>
                        <p className="text-slate-400">Connecting to secure channel {roomId}</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {room.status === 'lobby' ? (
                <GameLobby room={room} players={players} isHost={players.find(p => p.uid === user?.uid)?.isHost || false} />
            ) : (
                <GameBoard
                    room={room}
                    players={players}
                    myPlayer={players.find(p => p.uid === user?.uid)!}
                />
            )}
        </Layout>
    );
};
