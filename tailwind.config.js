/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: '#F4EFE6',
        'paper-dark': '#1A1814',
        terracotta: '#E76F51',
        'terracotta-dark': '#C45A3F',
        teal: '#2A9D8F',
        'teal-light': '#88D9B7',
        ink: '#264653',
        'ink-soft': '#3A5A6B',
        cream: '#F4E9D8',
        sand: '#E9C46A',
        'meal-color': '#F4A261',
        'study-color': '#2A9D8F',
        'workout-color': '#E76F51',
        'other-color': '#6D6875',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        brutal: '4px 4px 0 0 #1A1814',
        'brutal-sm': '2px 2px 0 0 #1A1814',
        'brutal-lg': '6px 6px 0 0 #1A1814',
        'brutal-hover': '0 0 0 0 #1A1814',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pop-in': 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'flame-flicker': 'flameFlicker 1.5s ease-in-out infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        flameFlicker: {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)' },
          '50%': { transform: 'scale(1.1) rotate(2deg)' },
        },
      },
    },
  },
  plugins: [],
};
