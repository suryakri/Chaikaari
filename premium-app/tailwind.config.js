/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                chai: {
                    olive: '#4A5D23',
                    wood: '#8B5A2B',
                    ink: '#111111',
                    cream: '#F9F6F0',
                    pink: '#E5B3BB',
                }
            },
            fontFamily: {
                display: ['Playfair Display', 'serif'],
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
