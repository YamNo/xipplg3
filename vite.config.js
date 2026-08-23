import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Pisahkan library besar jadi file sendiri supaya:
        // 1) halaman pertama tidak perlu mengunduh semuanya sekaligus,
        // 2) file library tetap ter-cache browser saat kode kita berubah.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          mui: ['@mui/material', '@mui/icons-material'],
          // slick-carousel sengaja tidak dimasukkan: kita hanya memakai file
          // CSS-nya, sedangkan entry JS-nya butuh jQuery.
          carousel: ['react-slick', 'react-swipeable-views'],
          ui: ['sweetalert2', 'aos', '@react-spring/web'],
        },
      },
    },
  },
})
