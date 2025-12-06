/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        guardian: {
          DEFAULT: '#3b82f6', // Blue-500
          dark: '#1d4ed8',
          light: '#60a5fa',
        },
        shadow: {
          DEFAULT: '#ef4444', // Red-500
          dark: '#b91c1c',
          light: '#f87171',
        },
        background: '#0f172a', // Slate-900
        surface: '#1e293b', // Slate-800
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'flip': 'flip 0.6s preserve-3d',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        }
      }
    },
  },
  plugins: [],
}
