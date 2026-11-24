/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        frieren: {
          bg: '#14121a',
          surface: '#1d1a26',
          card: '#232030',
          border: '#35314a',
          accent: '#d0bcff',
          'accent-dim': '#9d8df1',
          muted: '#a79fb8',
          text: '#e6e0e9',
          ok: '#7ddba3',
          fail: '#f2a3a3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
