# Sound Effects and Music

The game uses sound effects and background music to enhance the experience.
To enable sounds, you need to place audio files in the `public/sounds` directory.

## Required Files

Create a folder named `sounds` inside the `public` directory and add the following files:

### Background Music (Looping)
- `ambient.mp3`: Default background music (suspenseful/ambient).
- `heartbeat.mp3`: Played during the voting phase (tension/heartbeat).
- `lobby.mp3`: Played in the lobby (calm/waiting).
- `win.mp3`: Played when Guardians win.
- `loss.mp3`: Played when Shadows win.
- `endgame.mp3`: Played during Game Over screen.

### Sound Effects (One-shot)
- `notification.mp3`: General notification sound.
- `success.mp3`: Positive event (Vote passed, Guardian policy enacted).
- `danger.mp3`: Negative event (Shadow policy enacted, Chaos).
- `warning.mp3`: Warning event (Veto requested, Power unlocked).
- `gunshot.mp3`: Played when a player is executed.
- `start.mp3`: Played when the game starts.

## Notes
- You can use `.mp3`, `.wav`, or `.ogg` files, but ensure the code in `src/hooks/useGameSounds.ts` matches the extension. Currently, it expects `.mp3`.
- If you don't provide these files, the browser console will show "Audio play failed" errors, but the game will continue to function.
