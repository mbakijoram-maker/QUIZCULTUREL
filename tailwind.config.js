/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        kin: {
          night: '#2B1704', // fond principal : terre foncée / chocolat
          bark: '#3D2314', // conteneurs sombres (glassmorphism)
          earth: '#5A3418',
          wood: '#8B5A2B',
          caramel: '#C68B59', // cartes chaleureuses
          gold: '#D4A373', // bordures dorées, hover
          terracotta: '#E07A5F', // boutons et accents
          cream: '#FAEDCD', // textes
          sand: '#E9D5B0',
          leaf: '#9CB380', // succès
        },
      },
      fontFamily: {
        display: ['Kenia', 'Impact', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Motifs africains en SVG (public/patterns) : bg-motif-bogolan, bg-motif-kuba
        'motif-bogolan': "url('/patterns/bogolan.svg')",
        'motif-kuba': "url('/patterns/kuba.svg')",
        'glow-caramel': 'radial-gradient(ellipse at top, rgba(198,139,89,0.35), transparent 65%)',
      },
      boxShadow: {
        'gold-ring': '0 0 0 3px #D4A373, 0 0 36px rgba(212,163,115,0.55)',
        'terracotta-ring': '0 0 0 3px #E07A5F, 0 0 30px rgba(224,122,95,0.5)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
        drum: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
          '10%': { transform: 'scale(1.08, 0.94) rotate(-3deg)' },
          '20%': { transform: 'scale(0.98, 1.03) rotate(0deg)' },
          '50%': { transform: 'scale(1.06, 0.95) rotate(3deg)' },
          '60%': { transform: 'scale(1) rotate(0deg)' },
        },
        // Animations d'entrée sur transform uniquement : si le navigateur les met en pause
        // (onglet en arrière-plan), le contenu reste visible.
        pop: {
          '0%': { transform: 'scale(0.6)' },
          '60%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)' },
          '100%': { transform: 'translateY(0)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        drum: 'drum 1.2s ease-in-out infinite',
        pop: 'pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-up': 'slide-up 320ms ease-out both',
        ripple: 'ripple 2.4s ease-out infinite',
        shake: 'shake 420ms ease-in-out',
      },
    },
  },
  plugins: [],
};
