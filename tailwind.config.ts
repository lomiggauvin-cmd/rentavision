import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f0ff",
          100: "#e0dfff",
          200: "#c3bfff",
          300: "#9b92ff",
          400: "#7c5cfc",
          500: "#6a3ef5",
          600: "#5a1ee8",
          700: "#4c16c4",
          800: "#3f149f",
          900: "#351382",
          950: "#1e0a52",
        },
        emerald: {
          400: "#00d4aa",
          500: "#00c49a",
        },
        surface: {
          0: "#0a0a1a",
          50: "#0e0e24",
          100: "#111128",
          200: "#1a1a3e",
          300: "#242452",
          400: "#2e2e66",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
        pulse_glow: "pulseGlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 4px 20px rgba(124, 92, 252, 0.3)",
          },
          "50%": {
            boxShadow:
              "0 4px 35px rgba(124, 92, 252, 0.5), 0 0 60px rgba(124, 92, 252, 0.15)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
