import { useEffect, useRef, useState } from 'react';
import type { Room } from '../types';

export const useGameSounds = (room: Room | null) => {
    const [processedLogIds, setProcessedLogIds] = useState<Set<string>>(new Set());
    const bgmRef = useRef<HTMLAudioElement | null>(null);

    const playSound = (path: string, volume = 0.5) => {
        const audio = new Audio(path);
        audio.volume = volume;
        audio.play().catch(e => console.log("Audio play failed", e));
    };

    const playBGM = (path: string, volume = 0.3) => {
        if (bgmRef.current) {
            if (bgmRef.current.src.includes(path)) return; // Already playing
            bgmRef.current.pause();
        }

        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = volume;
        audio.play().catch(e => console.log("BGM play failed", e));
        bgmRef.current = audio;
    };

    const stopBGM = () => {
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current = null;
        }
    };

    // BGM Logic
    useEffect(() => {
        if (!room) {
            stopBGM();
            return;
        }

        if (room.status === 'lobby') {
            playBGM('/sounds/lobby.mp3', 0.2);
        } else if (room.turnPhase === 'voting') {
            playBGM('/sounds/heartbeat.mp3', 0.4);
        } else if (room.turnPhase === 'game_over') {
            if (room.winner === 'Guardians') playBGM('/sounds/win.mp3', 0.5);
            else playBGM('/sounds/loss.mp3', 0.5);
        } else {
            playBGM('/sounds/ambient.mp3', 0.2);
        }

        return () => {
            // Cleanup? No, we want BGM to persist across renders unless phase changes
        };
    }, [room?.status, room?.turnPhase, room?.winner]);

    // SFX Logic (Logs)
    useEffect(() => {
        if (!room?.logs || room.logs.length === 0) return;

        const lastLog = room.logs[room.logs.length - 1];
        if (processedLogIds.has(lastLog.id)) return;

        // Mark as processed
        setProcessedLogIds(prev => new Set(prev).add(lastLog.id));

        // Play sound based on type/message
        if (lastLog.type === 'success') {
            playSound('/sounds/success.mp3');
        } else if (lastLog.type === 'danger') {
            playSound('/sounds/danger.mp3');
        } else if (lastLog.type === 'warning') {
            playSound('/sounds/warning.mp3');
        } else {
            playSound('/sounds/notification.mp3', 0.2);
        }

        // Specific events
        if (lastLog.message.includes("executed")) {
            playSound('/sounds/gunshot.mp3', 0.6);
        }
        if (lastLog.message.includes("Game Started")) {
            playSound('/sounds/start.mp3', 0.6);
        }

    }, [room?.logs]);
};
