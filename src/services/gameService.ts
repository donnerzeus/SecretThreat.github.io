import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    Timestamp,
    arrayUnion,
    collection,
    writeBatch,
    getDocs
} from 'firebase/firestore';
import { signInAnonymously as firebaseSignInAnonymously, updateProfile } from 'firebase/auth';
import { auth, db } from './firebase';
import type { Room, Player, Role, PlayerRole, VoteChoice, PolicyType, TurnPhase } from '../types';

// ... (existing imports and functions)

const shuffle = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};



export const signIn = async (username: string) => {
    const userCredential = await firebaseSignInAnonymously(auth);
    if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: username });
    }
    return userCredential.user;
};

const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const createRoom = async (hostUid: string, hostName: string): Promise<string> => {
    const roomId = generateRoomCode();
    const roomRef = doc(db, 'rooms', roomId);

    // Check if room exists (simple collision check)
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
        return createRoom(hostUid, hostName); // Retry
    }

    const newRoom: Room = {
        roomId,
        hostUid,
        status: 'lobby',
        createdAt: serverTimestamp() as Timestamp,
        minPlayers: 5,
        maxPlayers: 10,
        playerOrder: [hostUid],
        electionTracker: 0,
        guardianPolicies: 0,
        shadowPolicies: 0,
        currentPresidentUid: null,
        currentChancellorCandidateUid: null,
        currentChancellorUid: null,
        winner: null,
        lastPolicyEnacted: null,
        vetoPowerUnlocked: false,
    };

    const hostPlayer: Player = {
        uid: hostUid,
        displayName: hostName,
        isHost: true,
        isAlive: true,
        joinedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(roomRef, newRoom);
    await setDoc(doc(db, `rooms/${roomId}/players`, hostUid), hostPlayer);

    return roomId;
};

export const joinRoom = async (roomId: string, uid: string, displayName: string) => {
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) {
            throw new Error('Room not found');
        }

        const roomData = roomSnap.data() as Room;
        if (roomData.status !== 'lobby') {
            throw new Error('Game already started');
        }

        // Check player count using the array in room document
        if (roomData.playerOrder.length >= roomData.maxPlayers) {
            throw new Error('Room is full');
        }

        if (roomData.playerOrder.includes(uid)) {
            return; // Already joined
        }

        const newPlayer: Player = {
            uid,
            displayName,
            isHost: false,
            isAlive: true,
            joinedAt: serverTimestamp() as Timestamp,
        };

        transaction.set(doc(db, `rooms/${roomId}/players`, uid), newPlayer);
        transaction.update(roomRef, {
            playerOrder: arrayUnion(uid)
        });
    });
};

export const subscribeToRoom = (roomId: string, callback: (room: Room) => void) => {
    return onSnapshot(doc(db, 'rooms', roomId), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as Room);
        }
    });
};

export const subscribeToPlayers = (roomId: string, callback: (players: Player[]) => void) => {
    return onSnapshot(collection(db, `rooms/${roomId}/players`), (snapshot) => {
        const players: Player[] = [];
        snapshot.forEach((doc) => {
            players.push(doc.data() as Player);
        });
        // Sort by join time or just rely on client sort
        players.sort((a, b) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0));
        callback(players);
    });
};

export const startGame = async (roomId: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) throw new Error('Room not found');

    // In a real app, verify host here using auth.currentUser.uid

    const playersSnap = await getDocs(collection(db, `rooms/${roomId}/players`));
    const playerUids = playersSnap.docs.map(d => d.id);
    const playerCount = playerUids.length;

    if (playerCount < 5) throw new Error('Not enough players (min 5)');

    // Assign Roles
    let guardians = 0;
    let shadows = 0;

    if (playerCount === 5) { guardians = 3; shadows = 1; }
    else if (playerCount === 6) { guardians = 4; shadows = 1; }
    else if (playerCount === 7) { guardians = 4; shadows = 2; }
    else if (playerCount === 8) { guardians = 5; shadows = 2; }
    else if (playerCount === 9) { guardians = 5; shadows = 3; }
    else if (playerCount === 10) { guardians = 6; shadows = 3; }

    const roles: Role[] = [
        ...Array(guardians).fill('Guardian'),
        ...Array(shadows).fill('Shadow'),
        'SecretThreat'
    ];

    const shuffledRoles = shuffle(roles);
    const shuffledPlayers = shuffle(playerUids); // Also shuffle seating order

    const batch = writeBatch(db);

    // Save Roles (Private)
    shuffledPlayers.forEach((uid, index) => {
        const role = shuffledRoles[index];
        const team = role === 'Guardian' ? 'Guardians' : 'Shadows';
        const roleRef = doc(db, `rooms/${roomId}/playerRoles`, uid);
        batch.set(roleRef, { uid, role, team });
    });

    // Create Policy Deck
    const deck = [
        ...Array(6).fill('Guardian'),
        ...Array(11).fill('Shadow')
    ];
    const shuffledDeck = shuffle(deck);

    batch.update(roomRef, {
        status: 'in-progress',
        turnPhase: 'nominating',
        playerOrder: shuffledPlayers,
        currentPresidentUid: shuffledPlayers[0],
        policyDeck: shuffledDeck,
        policyDiscard: [],
        hand: [],
        votes: {},
        guardianPolicies: 0,
        shadowPolicies: 0,
        electionTracker: 0,
        vetoPowerUnlocked: false
    });

    await batch.commit();
};

export const subscribeToPlayerRole = (roomId: string, uid: string, callback: (role: PlayerRole | null) => void) => {
    const roleRef = doc(db, 'rooms', roomId, 'playerRoles', uid);
    return onSnapshot(roleRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data() as PlayerRole);
        } else {
            callback(null);
        }
    });
};

export const subscribeToAllPlayerRoles = (roomId: string, callback: (roles: Record<string, PlayerRole>) => void) => {
    const rolesRef = collection(db, 'rooms', roomId, 'playerRoles');
    return onSnapshot(rolesRef, (snapshot) => {
        const roles: Record<string, PlayerRole> = {};
        snapshot.forEach(doc => {
            roles[doc.id] = doc.data() as PlayerRole;
        });
        callback(roles);
    });
};

export const performInvestigate = async (roomId: string, targetUid: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;

        // Get target role - READ FIRST
        const roleRef = doc(db, `rooms/${roomId}/playerRoles`, targetUid);
        const roleSnap = await transaction.get(roleRef);
        if (!roleSnap.exists()) throw new Error('Role not found');
        const roleData = roleSnap.data() as PlayerRole;

        const investigated = { ...(room.investigatedPlayers || {}), [targetUid]: roleData.team };

        // THEN WRITE
        transaction.update(roomRef, {
            investigatedPlayers: investigated,
            turnPhase: 'nominating' // End of power, next turn
        });

        await endTurn(transaction, roomRef, room);
    });
};

export const performExecution = async (roomId: string, targetUid: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;

        // READ FIRST
        const roleRef = doc(db, `rooms/${roomId}/playerRoles`, targetUid);
        const roleSnap = await transaction.get(roleRef);
        const roleData = roleSnap.data() as PlayerRole;

        // THEN WRITE
        // Kill player
        const playerRef = doc(db, `rooms/${roomId}/players`, targetUid);
        transaction.update(playerRef, { isAlive: false });

        // Check if Secret Threat was killed
        if (roleData.role === 'SecretThreat') {
            transaction.update(roomRef, {
                winner: 'Guardians',
                turnPhase: 'game_over',
                status: 'ended'
            });
        } else {
            await endTurn(transaction, roomRef, room);
        }
    });
};

export const performSpecialElection = async (roomId: string, nextPresidentUid: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
        previousPresidentUid: null, // TODO: Handle returning to original order if needed, but for now simple rotation reset
        // Actually special election interrupts order. 
        // We usually save current president to return to them? 
        // User said: "Bir sonraki başkanı belirle".
        // Let's just set the next president.
        currentPresidentUid: nextPresidentUid,
        turnPhase: 'nominating',
        currentChancellorCandidateUid: null,
        currentChancellorUid: null,
        votes: {}
    });
};

// Helper to rotate president and reset turn
const endTurn = async (transaction: any, roomRef: any, room: Room) => {


    // If we had a special election, we might need to return to the original order.
    // But for simplicity based on user request "currentPresidentIndex++", let's just follow the order.
    // If special election happened, usually the "next" president is the one after the *original* president.
    // Implementing simple next alive player logic for now.

    const currentIdx = room.playerOrder.indexOf(room.currentPresidentUid!);
    let nextIdx = (currentIdx + 1) % room.playerOrder.length;

    // Find next alive player
    // We need player data to check isAlive. 
    // Since we don't have it in 'room', we assume the client/UI handles "next" logic or we fetch players.
    // For this transaction, let's just increment. The UI should skip dead players or we need to read players here.
    // Let's read players to be safe.
    // This is expensive in a transaction but necessary for correctness.
    // Optimization: Store isAlive in playerOrder or separate map in Room?
    // For now, let's just increment.

    const nextPresident = room.playerOrder[nextIdx];

    transaction.update(roomRef, {
        currentPresidentUid: nextPresident,
        currentChancellorCandidateUid: null,
        currentChancellorUid: null,
        turnPhase: 'nominating',
        votes: {},
        electionTracker: 0 // Reset on successful turn? Or only on successful vote?
        // Rules: Election tracker resets when a policy is enacted (which happens before endTurn usually).
    });
};

export const nominateChancellor = async (roomId: string, candidateUid: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
        currentChancellorCandidateUid: candidateUid,
        turnPhase: 'voting',
        votes: {}
    });
};

export const voteOnGovernment = async (roomId: string, uid: string, vote: VoteChoice) => {
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;

        const newVotes = { ...room.votes, [uid]: vote };

        const playerCount = room.playerOrder.length;
        const voteCount = Object.keys(newVotes).length;

        if (voteCount < playerCount) {
            transaction.update(roomRef, { votes: newVotes });
            return;
        }

        const yesVotes = Object.values(newVotes).filter(v => v === 'yes').length;
        const noVotes = Object.values(newVotes).filter(v => v === 'no').length;

        if (yesVotes > noVotes) {
            // Check Secret Threat Chancellor Win Condition
            if (room.shadowPolicies >= 3) {
                // We need to check if chancellor candidate is Secret Threat
                const roleRef = doc(db, `rooms/${roomId}/playerRoles`, room.currentChancellorCandidateUid!);
                const roleSnap = await transaction.get(roleRef);
                const roleData = roleSnap.data() as PlayerRole;

                if (roleData.role === 'SecretThreat') {
                    transaction.update(roomRef, {
                        winner: 'Shadows',
                        turnPhase: 'game_over',
                        status: 'ended'
                    });
                    return;
                }
            }

            let deck = [...(room.policyDeck || [])];
            let discard = [...(room.policyDiscard || [])];

            if (deck.length < 3) {
                deck = [...deck, ...shuffle(discard)];
                discard = [];
            }

            const hand = deck.splice(0, 3);

            transaction.update(roomRef, {
                votes: newVotes,
                currentChancellorUid: room.currentChancellorCandidateUid,
                turnPhase: 'legislating_president',
                policyDeck: deck,
                policyDiscard: discard,
                hand: hand,
                electionTracker: 0
            });
        } else {
            // Failed Vote
            let tracker = room.electionTracker + 1;

            if (tracker >= 3) {
                // Chaos: Enact top policy
                let deck = [...(room.policyDeck || [])];
                let discard = [...(room.policyDiscard || [])];

                if (deck.length < 1) {
                    deck = [...deck, ...shuffle(discard)];
                    discard = [];
                }

                const enactedPolicy = deck.shift()!;

                let guardianPolicies = room.guardianPolicies;
                let shadowPolicies = room.shadowPolicies;

                if (enactedPolicy === 'Guardian') guardianPolicies++;
                else shadowPolicies++;

                // Check wins
                if (guardianPolicies === 6) {
                    transaction.update(roomRef, { guardianPolicies, winner: 'Guardians', turnPhase: 'game_over', status: 'ended' });
                    return;
                }
                if (shadowPolicies === 6) {
                    transaction.update(roomRef, { shadowPolicies, winner: 'Shadows', turnPhase: 'game_over', status: 'ended' });
                    return;
                }

                // Reset tracker and end turn (no powers on chaos)
                transaction.update(roomRef, {
                    guardianPolicies,
                    shadowPolicies,
                    lastPolicyEnacted: enactedPolicy,
                    policyDeck: deck,
                    policyDiscard: discard,
                    electionTracker: 0
                });
                await endTurn(transaction, roomRef, room);

            } else {
                // Just next president
                transaction.update(roomRef, {
                    votes: newVotes,
                    electionTracker: tracker
                });
                await endTurn(transaction, roomRef, room);
            }
        }
    });
};

export const endPeek = async (roomId: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;
        await endTurn(transaction, roomRef, room);
    });
};

export const discardPolicy = async (roomId: string, policyToDiscard: PolicyType) => {
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;

        const hand = [...(room.hand || [])];
        const discardIndex = hand.indexOf(policyToDiscard);
        if (discardIndex === -1) throw new Error('Policy not in hand');

        hand.splice(discardIndex, 1);
        const discardPile = [...(room.policyDiscard || []), policyToDiscard];

        if (room.turnPhase === 'legislating_president') {
            transaction.update(roomRef, {
                hand: hand,
                policyDiscard: discardPile,
                turnPhase: 'legislating_chancellor'
            });
        } else if (room.turnPhase === 'legislating_chancellor') {
            const enactedPolicy = hand[0];

            let guardianPolicies = room.guardianPolicies;
            let shadowPolicies = room.shadowPolicies;

            if (enactedPolicy === 'Guardian') guardianPolicies++;
            else shadowPolicies++;

            // Win Condition Checks
            if (guardianPolicies === 6) {
                transaction.update(roomRef, {
                    guardianPolicies,
                    winner: 'Guardians',
                    turnPhase: 'game_over',
                    status: 'ended'
                });
                return;
            }
            if (shadowPolicies === 6) {
                transaction.update(roomRef, {
                    shadowPolicies,
                    winner: 'Shadows',
                    turnPhase: 'game_over',
                    status: 'ended'
                });
                return;
            }

            // Powers
            let nextPhase: TurnPhase = 'nominating';

            if (enactedPolicy === 'Shadow') {
                // Powers based on player count and policy count
                // User's previous request:
                // 2: Investigate
                // 3: Special Election
                // 4: Execution + Veto
                // 5: Execution

                // User complaint implies they expect Peek at 3.
                // Let's adjust the table to include Peek at 3, keeping Investigate at 2.
                // This aligns with standard 5-6 player rules for Peek, and user's complaint.
                // For 5-6 players:
                // 2: Investigate (User's custom rule)
                // 3: Policy Peek (Standard rule, user complaint)
                // 4: Execution + Veto (User's custom rule)
                // 5: Execution (User's custom rule)

                if (shadowPolicies === 2) nextPhase = 'pp_investigate';
                else if (shadowPolicies === 3) nextPhase = 'pp_peek'; // Changed from Special Election to Peek
                else if (shadowPolicies === 4) {
                    nextPhase = 'pp_execution';
                    transaction.update(roomRef, { vetoPowerUnlocked: true });
                }
                else if (shadowPolicies === 5) nextPhase = 'pp_execution';
            }

            if (nextPhase === 'nominating') {
                // No power, end turn
                await endTurn(transaction, roomRef, room);
                // We need to update policies too
                transaction.update(roomRef, {
                    guardianPolicies,
                    shadowPolicies,
                    lastPolicyEnacted: enactedPolicy,
                    hand: [],
                    policyDiscard: discardPile,
                    electionTracker: 0
                });
            } else {
                // Go to power phase
                transaction.update(roomRef, {
                    guardianPolicies,
                    shadowPolicies,
                    lastPolicyEnacted: enactedPolicy,
                    hand: [],
                    policyDiscard: discardPile,
                    turnPhase: nextPhase,
                    electionTracker: 0
                });
            }
        }
    });
};
