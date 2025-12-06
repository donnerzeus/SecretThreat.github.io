import {
    doc,
    setDoc,
    getDoc,
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
import type { Room, Player, Role } from '../types';

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
        playerOrder: shuffledPlayers,
        currentPresidentUid: shuffledPlayers[0],
        policyDeck: shuffledDeck,
        policyDiscard: [],
        guardianPolicies: 0,
        shadowPolicies: 0,
        electionTracker: 0,
        vetoPowerUnlocked: false
    });

    await batch.commit();
};
