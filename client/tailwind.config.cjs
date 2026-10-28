/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201D",
        moss: "#255D47",
        mint: "#E5F2EB",
        line: "#DCE3DF",
        warm: "#F6F7F4",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,32,29,.04), 0 12px 36px rgba(23,32,29,.05)",
      },
    },
  },
  plugins: [],
};
