/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind scanner disse filer for klassenavne. Tilføjer du nye mapper
  // med komponenter, skal de med her – ellers bliver deres styles ikke bygget.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
