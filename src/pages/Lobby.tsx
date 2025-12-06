import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom } from '../services/gameService';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Layout } from '../components/Layout';
import { Users, PlusCircle, LogOut } from 'lucide-react';

export const Lobby: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'menu' | 'join'>('menu');

    const handleCreateRoom = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const roomId = await createRoom(user.uid, user.displayName || 'Unknown');
            navigate(`/room/${roomId}`);
        } catch (error) {
            console.error('Failed to create room', error);
            alert('Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !roomCode) return;

        setLoading(true);
        try {
            await joinRoom(roomCode.toUpperCase(), user.uid, user.displayName || 'Unknown');
            navigate(`/room/${roomCode.toUpperCase()}`);
        } catch (error: any) {
            console.error('Failed to join room', error);
            alert(error.message || 'Failed to join room');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null; // Or redirect to login

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome, Agent {user.displayName}</h2>
                    <p className="text-slate-400">Choose your mission.</p>
                </div>

                <Card className="w-full max-w-md">
                    {mode === 'menu' ? (
                        <div className="space-y-4">
                            <Button
                                onClick={handleCreateRoom}
                                className="w-full flex items-center justify-center gap-2"
                                size="lg"
                                disabled={loading}
                            >
                                <PlusCircle className="w-5 h-5" />
                                Create New Operation
                            </Button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">OR</span>
                                <div className="flex-grow border-t border-slate-700"></div>
                            </div>

                            <Button
                                onClick={() => setMode('join')}
                                variant="secondary"
                                className="w-full flex items-center justify-center gap-2"
                                size="lg"
                            >
                                <Users className="w-5 h-5" />
                                Join Existing Operation
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleJoinRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Operation Code
                                </label>
                                <Input
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. A1B2"
                                    maxLength={6}
                                    className="text-center text-2xl tracking-widest uppercase font-mono"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setMode('menu')}
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-[2]"
                                    disabled={loading || roomCode.length < 4}
                                >
                                    {loading ? 'Connecting...' : 'Join Operation'}
                                </Button>
                            </div>
                        </form>
                    )}
                </Card>

                <Button
                    variant="ghost"
                    className="mt-8 text-slate-500 hover:text-red-400"
                    onClick={() => navigate('/')}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Abort Mission (Logout)
                </Button>
            </div>
        </Layout>
    );
};
