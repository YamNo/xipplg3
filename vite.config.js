import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Service worker memperbarui diri sendiri saat ada versi baru,
      // jadi pengguna tidak perlu menghapus cache manual.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'LogoPPLG3.jpg'],
      manifest: {
        name: 'XI PPLG 3 - SMK Media Informatika',
        short_name: 'XI PPLG 3',
        description:
          'Website kelas XI PPLG 3: jadwal pelajaran, tugas & PR, galeri kelas, dan Text Anonim.',
        lang: 'id',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1e1e1e',
        theme_color: '#1e1e1e',
        categories: ['education'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Tugas & PR', short_name: 'Tugas', url: '/TugasPR' },
          { name: 'Penghitung Skor', short_name: 'Skor', url: '/Penghitung_Skor' },
        ],
      },
      workbox: {
        // Precache dibatasi ke kode + ikon saja. Gambar besar (Welcome.png,
        // Background.jpg) dan data Firestore/Cloudinary diambil dari jaringan
        // supaya pemasangan awal ringan dan isinya selalu terbaru.
        globPatterns: ['**/*.{js,css,html}', 'pwa-*.png', 'apple-touch-icon.png'],
        navigateFallback: '/index.html',
        // Permintaan ke API/webhook jangan pernah dilayani service worker.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
