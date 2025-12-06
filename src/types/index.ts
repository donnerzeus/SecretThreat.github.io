import { Timestamp } from 'firebase/firestore';

export type Role = 'Guardian' | 'Shadow' | 'SecretThreat';
export type Team = 'Guardians' | 'Shadows';
export type GameStatus = 'lobby' | 'in-progress' | 'ended';
export type VoteChoice = 'yes' | 'no';
export type PolicyType = 'Guardian' | 'Shadow';

export interface Player {
    uid: string;
    displayName: string;
    isHost: boolean;
    isAlive: boolean;
    joinedAt: Timestamp;
}

export interface PlayerRole {
    uid: string;
    role: Role;
    team: Team;
}

export interface GameLog {
    id: string;
    message: string;
    type: 'info' | 'success' | 'danger' | 'warning';
    timestamp: Timestamp;
}

export type TurnPhase =
    | 'nominating'
    | 'voting'
    | 'legislating_president'
    | 'legislating_chancellor'
    | 'veto_requested'
    | 'pp_investigate'
    | 'pp_execution'
    | 'pp_special_election'
    | 'pp_peek'
    | 'game_over';

export interface Room {
    roomId: string;
    hostUid: string;
    status: GameStatus;
    turnPhase?: TurnPhase;
    createdAt: Timestamp;
    minPlayers: number;
    maxPlayers: number;
    playerOrder: string[]; // Array of UIDs
    electionTracker: number;
    guardianPolicies: number;
    shadowPolicies: number;
    currentPresidentUid: string | null;
    currentChancellorCandidateUid: string | null;
    currentChancellorUid: string | null;
    winner: Team | null;
    lastPolicyEnacted: PolicyType | null;
    vetoPowerUnlocked: boolean;
    policyDeck?: PolicyType[];
    policyDiscard?: PolicyType[];
    hand?: PolicyType[];
    votes?: Record<string, VoteChoice>;
    investigatedPlayers?: Record<string, Team>; // uid -> team (result of investigation)
    previousPresidentUid?: string | null; // For returning after special election
    logs: GameLog[];
}

export interface CurrentElection {
    presidentUid: string;
    chancellorCandidateUid: string | null;
    chancellorUid: string | null;
    votesOpen: boolean;
    voteDeadline: Timestamp | null;
    resultRevealed: boolean;
    passed: boolean | null;
    votes: Record<string, VoteChoice>; // uid -> choice
}

export interface PolicyState {
    deck: PolicyType[];
    discard: PolicyType[];
}

export interface GameState {
    room: Room;
    players: Record<string, Player>;
    election: CurrentElection | null;
    policyState: PolicyState; // Only visible to server/admin usually, but simplified here
}
