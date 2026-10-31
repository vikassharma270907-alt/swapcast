import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b0e14",
        panel: "#141922",
        edge: "#232a38",
        accent: "#6ee7b7",
        accent2: "#38bdf8",
      },
    },
  },
  plugins: [],
};

export default config;
