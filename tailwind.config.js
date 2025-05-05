/** @type {import('tailwindcss').Config} */
export default {
    content: [
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
      extend: {
        colors: {
          background: 'var(--background)',
          foreground: 'var(--foreground)',
          'header-bg': 'var(--header-bg)',
          'header-text': 'var(--header-text)',
          'card-bg': 'var(--card-bg)',
          border: 'var(--border)',
        },
      },
    },
    plugins: [],
  };