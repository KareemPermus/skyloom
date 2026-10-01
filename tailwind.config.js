/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0EA5E9',
        primaryDark: '#0369A1',
        accent: '#6366F1',
        sun: '#F59E0B',
        ink: '#0F172A',
        muted: '#64748B',
        surface: '#F8FAFC',
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};