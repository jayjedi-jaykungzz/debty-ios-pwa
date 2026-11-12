/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ios-bg-grouped': 'var(--bg-grouped)',
        'ios-bg-card': 'var(--bg-card)',
        'ios-bg-tertiary': 'var(--bg-tertiary)',
        'ios-bg-sheet': 'var(--bg-sheet)',
        'ios-text-primary': 'var(--text-primary)',
        'ios-text-secondary': 'var(--text-secondary)',
        'ios-separator': 'var(--separator)',
        'ios-blue': 'var(--ios-blue)',
        'ios-green': 'var(--ios-green)',
        'ios-red': 'var(--ios-red)',
        'ios-orange': 'var(--ios-orange)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
