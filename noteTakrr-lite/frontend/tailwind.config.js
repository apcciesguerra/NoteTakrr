/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6D28D9',
        secondary: '#4C1D95',
        background: '#1F1F2E',
        surface: '#2D2D44',
        textPrimary: '#F5F5F5',
        textSecondary: '#B4B4C8',
        accent: '#A78BFA',
      },
    },
  },
  plugins: [],
};
