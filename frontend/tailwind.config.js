/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#f0f4ff', 100:'#dde7ff', 200:'#c4d2ff', 300:'#a3b8ff', 400:'#7b96ff', 500:'#5b74f5', 600:'#4455e8', 700:'#3843ce', 800:'#3039a6', 900:'#2d3483' },
      }
    }
  },
  plugins: [],
}
