import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../services/gameService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Layout } from '../components/Layout';
import { RulesModal } from '../components/game/RulesModal';
import { ShieldAlert, HelpCircle } from 'lucide-react';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setLoading(true);
        try {
            await signIn(username);
            navigate('/lobby');
        } catch (error) {
            console.error('Login failed', error);
            alert('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="mb-8 text-center relative">
                    <button
                        onClick={() => setShowRules(true)}
                        className="absolute -right-12 top-0 text-slate-500 hover:text-yellow-500 transition-colors"
                        title="How to Play"
                    >
                        <HelpCircle className="w-6 h-6" />
                    </button>

                    <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-4 animate-pulse" />
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
                        SECRET THREAT
                    </h1>
                    <p className="text-slate-400 mt-2">Trust no one. Suspect everyone.</p>
                </div>

                <Card className="w-full max-w-md">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Codename
                            </label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your alias..."
                                maxLength={16}
                                required
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || username.length < 3}
                            size="lg"
                        >
                            {loading ? 'Authenticating...' : 'Enter the Shadows'}
                        </Button>
                    </form>
                </Card>
                <div className="mt-8 text-slate-600 text-sm font-mono flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                        <span>Developed by Donnerzeus</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span className="text-slate-500">v1.0.0</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-300 text-xs"
                        onClick={() => setShowRules(true)}
                    >
                        How to Play / Nasıl Oynanır
                    </Button>
                </div>
            </div>
        </Layout>
    );
};
