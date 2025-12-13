
import { describe, it, expect, vi } from 'vitest';
import { endTurn } from './gameService';
import type { Room } from '../types';

// Mock Firebase modules
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
    getAnalytics: vi.fn(),
    isSupported: vi.fn().mockResolvedValue(false),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    runTransaction: vi.fn(),
    collection: vi.fn(),
    serverTimestamp: vi.fn(),
    Timestamp: { now: vi.fn() },
    arrayUnion: vi.fn(),
}));

describe('gameService', () => {
    describe('endTurn', () => {
        it('should skip dead players when rotating president', async () => {
            const mockRoom: Room = {
                roomId: 'test-room',
                playerOrder: ['uid-1', 'uid-2', 'uid-3'],
                currentPresidentUid: 'uid-1',
                currentChancellorUid: null,
                turnPhase: 'voting',
                votes: {},
                // ... other props
            } as any;

            const mockTransaction = {
                get: vi.fn().mockImplementation((ref) => {
                    return Promise.resolve({
                        exists: () => true,
                        data: () => {
                            // If checking uid-2, return isAlive: false
                            if (ref.id === 'uid-2') return { isAlive: false };
                            return { isAlive: true };
                        }
                    });
                }),
                update: vi.fn()
            };

            // Mock doc to return an object with an ID we can check
            const { doc } = await import('firebase/firestore');
            (doc as any).mockImplementation((_db: any, ...pathSegments: string[]) => {
                return { id: pathSegments[pathSegments.length - 1] };
            });

            await endTurn(mockTransaction, { id: 'room-1' }, mockRoom);

            expect(mockTransaction.update).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    currentPresidentUid: 'uid-3' // Should skip uid-2
                })
            );
        });
    });
});
