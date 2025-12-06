import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../services/gameService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Layout } from '../components/Layout';
import { ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
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
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="mb-8 text-center">
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
            </div>
        </Layout>
    );
};
