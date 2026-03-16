/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#050a14',         // Deeper black-blue
        darkCard: '#0f172a',       // Slate 900
        primary: '#22d3ee',        // Cyan 400
        secondary: '#3b82f6',      // Blue 500
        accent: '#22d3ee',         // Cyan 400
        danger: '#fb7185',         // Rose 400 (Better than standard red)
        warning: '#fbbf24',        // Amber 400
        success: '#34d399',        // Emerald 400
        muted: '#64748b',          // Slate 500
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34, 211, 238, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(34, 211, 238, 0.6)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
