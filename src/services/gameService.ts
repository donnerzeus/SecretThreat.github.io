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
import type { Room, Player, Role, PlayerRole, VoteChoice, PolicyType, TurnPhase, GameLog, Team } from '../types';

// ... (imports)

// Add these at the end
export const requestVeto = async (roomId: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
        turnPhase: 'veto_requested'
    });
};

export const respondToVeto = async (roomId: string, approved: boolean) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error("Room not found");
        const room = roomSnap.data() as Room;

        if (approved) {
            // Discard hand
            const hand = room.hand || [];
            const discard = [...(room.policyDiscard || []), ...hand];

            let tracker = room.electionTracker + 1;

            if (tracker >= 3) {
                // Chaos: Enact top policy
                let deck = [...(room.policyDeck || [])];
                let discardPile = discard;

                if (deck.length < 1) {
                    deck = [...deck, ...shuffle(discardPile)];
                    discardPile = [];
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

                transaction.update(roomRef, {
                    guardianPolicies,
                    shadowPolicies,
                    lastPolicyEnacted: enactedPolicy,
                    policyDeck: deck,
                    policyDiscard: discardPile,
                    electionTracker: 0,
                    hand: []
                });
                await endTurn(transaction, roomRef, room);

            } else {
                transaction.update(roomRef, {
                    hand: [],
                    policyDiscard: discard,
                    electionTracker: tracker
                });
                await endTurn(transaction, roomRef, room);
            }
        } else {
            // Rejected: Chancellor must enact
            transaction.update(roomRef, {
                turnPhase: 'legislating_chancellor'
            });
        }
    });
};

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
        logs: []
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
        vetoPowerUnlocked: false,
        logs: [createLog("Game Started!", "success")]
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

        // Get target name
        const playerRef = doc(db, `rooms/${roomId}/players`, targetUid);
        const playerSnap = await transaction.get(playerRef);
        const playerName = playerSnap.data()?.displayName || "Unknown";

        const investigated = { ...(room.investigatedPlayers || {}), [targetUid]: roleData.team };

        // THEN WRITE
        transaction.update(roomRef, {
            investigatedPlayers: investigated,
            turnPhase: 'pp_investigate_result', // Show result
            logs: [...(room.logs || []), createLog(`President investigated ${playerName}.`, "info")]
        });
    });
};

export const endInvestigation = async (roomId: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;
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

        // Get target name
        const playerRef = doc(db, `rooms/${roomId}/players`, targetUid);
        const playerSnap = await transaction.get(playerRef);
        const playerName = playerSnap.data()?.displayName || "Unknown";

        // THEN WRITE
        // Kill player
        transaction.update(playerRef, { isAlive: false });

        // Check if Secret Threat was killed
        if (roleData.role === 'SecretThreat') {
            transaction.update(roomRef, {
                winner: 'Guardians',
                turnPhase: 'game_over',
                status: 'ended',
                logs: [...(room.logs || []), createLog(`President executed ${playerName} (SECRET THREAT)! Guardians Win!`, "success")]
            });
        } else {
            if (!roomSnap.exists()) throw new Error('Room not found');
            const room = roomSnap.data() as Room;
            transaction.update(roomRef, {
                logs: [...(room.logs || []), createLog(`President executed ${playerName}.`, "danger")]
            });
            await endTurn(transaction, roomRef, room);
        }
    });
};

// Helper to create a log entry
const createLog = (message: string, type: 'info' | 'success' | 'danger' | 'warning' = 'info'): GameLog => ({
    id: Math.random().toString(36).substring(2, 9),
    message,
    type,
    timestamp: Timestamp.now()
});

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
export const endTurn = async (transaction: any, roomRef: any, room: Room) => {
    const currentIdx = room.playerOrder.indexOf(room.currentPresidentUid!);
    let nextIdx = (currentIdx + 1) % room.playerOrder.length;
    let nextPresidentUid = room.playerOrder[nextIdx];

    // Find next alive player
    let attempts = 0;
    while (attempts < room.playerOrder.length) {
        const pRef = doc(db, 'rooms', roomRef.id, 'players', nextPresidentUid);
        const pSnap = await transaction.get(pRef);

        if (pSnap.exists() && pSnap.data().isAlive) {
            break; // Found alive player
        }

        // Move to next
        nextIdx = (nextIdx + 1) % room.playerOrder.length;
        nextPresidentUid = room.playerOrder[nextIdx];
        attempts++;
    }

    if (attempts >= room.playerOrder.length) {
        console.error("No alive players found!");
        return;
    }

    transaction.update(roomRef, {
        previousPresidentUid: room.currentPresidentUid,
        previousChancellorUid: room.currentChancellorUid,
        currentPresidentUid: nextPresidentUid,
        currentChancellorCandidateUid: null,
        currentChancellorUid: null,
        turnPhase: 'nominating',
        votes: {},
        // electionTracker: 0 // REMOVED: Managed by callers
    });
};

export const nominateChancellor = async (roomId: string, candidateUid: string, candidateName: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    const candidateRef = doc(db, 'rooms', roomId, 'players', candidateUid);

    // Validate that the candidate is alive
    const candidateSnap = await getDoc(candidateRef);
    if (!candidateSnap.exists()) {
        throw new Error('Candidate player not found');
    }

    const candidateData = candidateSnap.data();
    if (!candidateData.isAlive) {
        throw new Error('Cannot nominate a dead player as Chancellor');
    }

    await updateDoc(roomRef, {
        currentChancellorCandidateUid: candidateUid,
        turnPhase: 'voting',
        votes: {},
        logs: arrayUnion(createLog(`President nominated ${candidateName} as Chancellor.`, 'info'))
    });
};

export const voteOnGovernment = async (roomId: string, uid: string, vote: VoteChoice) => {
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;

        if (uid === room.currentPresidentUid) {
            throw new Error("President cannot vote!");
        }

        // Calculate required votes (Alive players - President)
        let aliveCount = 0;
        for (const pUid of room.playerOrder) {
            const pRef = doc(db, 'rooms', roomId, 'players', pUid);
            const pSnap = await transaction.get(pRef);
            if (pSnap.exists() && pSnap.data().isAlive) {
                aliveCount++;
            }
        }

        const newVotes = { ...room.votes, [uid]: vote };
        const voteCount = Object.keys(newVotes).length;

        // President cannot vote, so required is aliveCount - 1
        // If President is dead (unlikely as they are current president), logic still holds (they are not in aliveCount)
        // But President MUST be alive to be President.
        const requiredVotes = aliveCount - 1;

        if (voteCount < requiredVotes) {
            transaction.update(roomRef, { votes: newVotes });
            return;
        }

        // All voted -> Go to results
        transaction.update(roomRef, {
            votes: newVotes,
            turnPhase: 'voting_results',
            logs: [...(room.logs || []), createLog("Voting closed. Revealing votes...", "info")]
        });
    });
};

export const forceEndVoting = async (roomId: string) => {
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;

        if (room.turnPhase !== 'voting') throw new Error('Not in voting phase');

        const newVotes = { ...room.votes };

        // Check all players
        for (const pUid of room.playerOrder) {
            // Skip President (they don't vote)
            if (pUid === room.currentPresidentUid) continue;

            // If player hasn't voted
            if (!newVotes[pUid]) {
                const pRef = doc(db, 'rooms', roomId, 'players', pUid);
                const pSnap = await transaction.get(pRef);

                // If alive and hasn't voted, force 'no'
                if (pSnap.exists() && pSnap.data().isAlive) {
                    newVotes[pUid] = 'no';
                }
            }
        }

        // Force transition
        transaction.update(roomRef, {
            votes: newVotes,
            turnPhase: 'voting_results',
            logs: [...(room.logs || []), createLog("Voting forced by Host. Missing votes counted as NEIN.", "warning")]
        });
    });
};

export const processVotingResults = async (roomId: string) => {
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) throw new Error('Room not found');
        const room = roomSnap.data() as Room;

        const yesVotes = Object.values(room.votes || {}).filter(v => v === 'yes').length;
        const noVotes = Object.values(room.votes || {}).filter(v => v === 'no').length;

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
                        status: 'ended',
                        logs: [...(room.logs || []), createLog("Secret Threat elected Chancellor! Shadows Win!", "danger")]
                    });
                    return;
                }
            }

            let deck = [...(room.policyDeck || [])];
            let discard = [...(room.policyDiscard || [])];

            // Reshuffle if we don't have enough cards
            if (deck.length < 3) {
                if (deck.length + discard.length < 3) {
                    console.error('Not enough cards in deck + discard!', { deck: deck.length, discard: discard.length });
                    // This should never happen in a properly initialized game
                }
                deck = [...deck, ...shuffle(discard)];
                discard = [];
            }

            const hand = deck.splice(0, 3);

            transaction.update(roomRef, {
                currentChancellorUid: room.currentChancellorCandidateUid,
                turnPhase: 'legislating_president',
                policyDeck: deck,
                policyDiscard: discard,
                hand: hand,
                electionTracker: 0,
                logs: [...(room.logs || []), createLog("Vote Passed! Chancellor elected.", "success")]
            });
        } else {
            // Failed Vote
            let tracker = room.electionTracker + 1;

            if (tracker >= 3) {
                // Chaos: Enact top policy
                let deck = [...(room.policyDeck || [])];
                let discard = [...(room.policyDiscard || [])];

                if (deck.length < 1) {
                    if (deck.length + discard.length < 1) {
                        console.error('Not enough cards for chaos!', { deck: deck.length, discard: discard.length });
                    }
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
                    electionTracker: 0,
                    logs: [...(room.logs || []), createLog(`Chaos! ${enactedPolicy} Policy enacted due to failed votes.`, "danger")]
                });
                await endTurn(transaction, roomRef, room);

            } else {
                // Just next president
                transaction.update(roomRef, {
                    electionTracker: tracker,
                    logs: [...(room.logs || []), createLog("Vote Failed! Election Tracker advanced.", "warning")]
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

        transaction.update(roomRef, {
            logs: [...(room.logs || []), createLog("President finished peeking.", "info")]
        });

        await endTurn(transaction, roomRef, room);
    });
};

export const discardPolicy = async (roomId: string, policyToDiscard: PolicyType) => {
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Room not found");
        const room = roomDoc.data() as Room;

        const hand = [...(room.hand || [])];
        const discardIndex = hand.indexOf(policyToDiscard);
        if (discardIndex === -1) throw new Error("Policy not in hand");

        // Remove discarded policy
        hand.splice(discardIndex, 1);
        const discardPile = [...(room.policyDiscard || []), policyToDiscard];

        // Logs
        let newLogs = [...(room.logs || [])];

        if (room.turnPhase === 'legislating_president') {
            // President discarded 1, pass 2 to Chancellor
            newLogs.push(createLog("President discarded a policy. Chancellor is now legislating.", "info"));
            transaction.update(roomRef, {
                hand,
                policyDiscard: discardPile,
                turnPhase: 'legislating_chancellor',
                logs: newLogs
            });
        } else if (room.turnPhase === 'legislating_chancellor') {
            // Chancellor discarded 1, enact the remaining one
            const enactedPolicy = hand[0];
            let guardianPolicies = room.guardianPolicies;
            let shadowPolicies = room.shadowPolicies;
            let winner: Team | null = null;

            if (enactedPolicy === 'Guardian') {
                guardianPolicies++;
                newLogs.push(createLog("A Guardian Policy has been enacted!", "success"));
                if (guardianPolicies >= 5) winner = 'Guardians';
            } else {
                shadowPolicies++;
                newLogs.push(createLog("A Shadow Policy has been enacted!", "danger"));
                if (shadowPolicies >= 6) winner = 'Shadows';
            }

            // Check for powers
            let nextPhase: TurnPhase = 'nominating';
            if (!winner && enactedPolicy === 'Shadow') {
                if (shadowPolicies === 2) nextPhase = 'pp_investigate';
                else if (shadowPolicies === 3) nextPhase = 'pp_peek';
                else if (shadowPolicies === 4) {
                    nextPhase = 'pp_execution';
                    transaction.update(roomRef, { vetoPowerUnlocked: true });
                }
                else if (shadowPolicies === 5) nextPhase = 'pp_execution';
            }

            if (winner) {
                newLogs.push(createLog(`Game Over! ${winner} Win!`, winner === 'Guardians' ? 'success' : 'danger'));
                transaction.update(roomRef, {
                    guardianPolicies,
                    shadowPolicies,
                    lastPolicyEnacted: enactedPolicy,
                    hand: [],
                    policyDiscard: discardPile,
                    electionTracker: 0,
                    turnPhase: 'game_over',
                    winner,
                    logs: newLogs
                });
                return;
            }

            if (nextPhase !== 'nominating') {
                newLogs.push(createLog(`Presidential Power Unlocked: ${nextPhase.replace('pp_', '').toUpperCase()}`, "warning"));
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
                    electionTracker: 0,
                    logs: newLogs
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
                    electionTracker: 0,
                    logs: newLogs
                });
            }
        }
    });
};
