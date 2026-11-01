/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f8fa',
        paper: '#ffffff',
        viewer: '#e8ecf2',
        toolbar: '#1a2233',
        'ink-900': '#101828',
        'ink-800': '#1d2939',
        'ink-700': '#344054',
        'ink-600': '#475467',
        'ink-500': '#667085',
        line: '#e4e7ec',
        brand: {
          50: '#f5f8ff',
          300: '#84b2ff',
          500: '#2970ff',
          700: '#175cd3',
        },
        success: {
          50: '#ecfdf3',
          500: '#22c55e',
          700: '#067647',
        },
        warn: {
          50: '#fffaeb',
          300: '#fdb022',
          500: '#f59e0b',
          700: '#b54708',
        },
        error: {
          50: '#fef3f2',
          500: '#ef4444',
          700: '#b42318',
        },
      },
      boxShadow: {
        paper: '0 1px 2px rgba(16, 24, 40, 0.02), 0 1px 3px rgba(16, 24, 40, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
