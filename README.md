# Secret Threat

A real-time social deduction game inspired by Secret Hitler, built with React, TypeScript, TailwindCSS, and Firebase.

## Features

- **Real-time Multiplayer**: Powered by Firebase Firestore.
- **Secret Roles**: Guardians vs. Shadows vs. Secret Threat.
- **Mobile First**: Designed for single-hand usage on mobile devices.
- **Interactive UI**: 3D card flips, dark mode aesthetics, and smooth animations.

## Setup

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** and turn on **Anonymous** sign-in.
4. Enable **Firestore Database** (start in test mode for development).
5. Enable **Functions** (requires Blaze plan) OR use the local emulator.
6. Create a web app in project settings and copy the config.

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Run with Firebase Emulators (Recommended for Local Dev)

Since Cloud Functions require the Blaze plan for production deployment, you can test the full game logic locally using the Firebase Emulator Suite.

1.  Navigate to the functions directory: `cd functions`
2.  Install dependencies: `npm install`
3.  Start the emulators:
    ```bash
    npm run serve
    ```
4.  In another terminal, run the frontend:
    ```bash
    npm run dev
    ```
    (Ensure your frontend is pointing to the emulator ports if needed, or use the Firebase Auth/Firestore emulators automatically if configured).

## Deployment

To deploy to GitHub Pages:

1. Update `vite.config.ts` base URL if needed.
2. Run `npm run build`.
3. Deploy the `dist` folder.

## Game Rules

- **Guardians (Liberals)**: Pass 5 Guardian policies or kill the Secret Threat.
- **Shadows (Fascists)**: Pass 6 Shadow policies or elect Secret Threat as Chancellor after 3 Shadow policies.
- **Secret Threat**: Don't get caught!

## Architecture

- **Frontend**: React + Vite + TailwindCSS
- **State**: Firebase Firestore (Real-time)
- **Logic**: Cloud Functions (Game rules, role distribution)
