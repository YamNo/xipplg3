import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Created from './Pages/Created.jsx'
import AdminLogin from './Pages/AdminLogin.jsx'
import TugasPRPage from './Pages/TugasPRPage.jsx'
import Changelog from './Pages/Changelog.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/created" element={<Created />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/TugasPR" element={<TugasPRPage />} />
        <Route path="/Changelog" element={<Changelog />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
