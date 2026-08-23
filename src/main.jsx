import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import './index.css'

// Halaman selain beranda dimuat hanya saat dibuka, supaya unduhan awal ringan.
const Created = lazy(() => import('./Pages/Created.jsx'))
const AdminLogin = lazy(() => import('./Pages/AdminLogin.jsx'))
const TugasPRPage = lazy(() => import('./Pages/TugasPRPage.jsx'))
const Changelog = lazy(() => import('./Pages/Changelog.jsx'))
const PenghitungSkor = lazy(() => import('./Pages/PenghitungSkor.jsx'))

// Browser secara bawaan mengingat posisi scroll terakhir dan memulihkannya saat
// halaman di-refresh, sehingga web terlihat "kebuka dalam posisi ter-scroll".
// Matikan supaya selalu mulai dari atas.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
window.scrollTo(0, 0)

const Memuat = () => (
  <div className="min-h-screen flex items-center justify-center text-white">
    <p className="opacity-60">Memuat...</p>
  </div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<Memuat />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/created" element={<Created />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/TugasPR" element={<TugasPRPage />} />
          <Route path="/Changelog" element={<Changelog />} />
          <Route path="/Penghitung_Skor" element={<PenghitungSkor />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
