// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "terminal-bg": "#0d1117",
        "terminal-green": "#00ff41", // マトリックス風グリーン
        "terminal-border": "#30363d",
        "terminal-text": "#adbac7",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  plugins: [],
};
export default config;
