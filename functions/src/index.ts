import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

type Role = 'Guardian' | 'Shadow' | 'SecretThreat';

const shuffle = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

export const startGame = onCall(async (request) => {
    const { data, auth } = request;
    const { roomId } = data;

    if (!auth) throw new HttpsError('unauthenticated', 'Must be logged in');

    const roomRef = db.collection('rooms').doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) throw new HttpsError('not-found', 'Room not found');

    const roomData = roomSnap.data();
    if (roomData?.hostUid !== auth.uid) throw new HttpsError('permission-denied', 'Only host can start');

    const playersSnap = await roomRef.collection('players').get();
    const playerUids = playersSnap.docs.map(d => d.id);
    const playerCount = playerUids.length;

    if (playerCount < 5) throw new HttpsError('failed-precondition', 'Not enough players');

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

    const batch = db.batch();

    // Save Roles (Private)
    shuffledPlayers.forEach((uid, index) => {
        const role = shuffledRoles[index];
        const team = role === 'Guardian' ? 'Guardians' : 'Shadows';
        const roleRef = roomRef.collection('playerRoles').doc(uid);
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
    return { success: true };
});

// More functions would go here (submitVote, etc.)
