import { useEffect, useState } from "react"

// Kredensial admin dibaca dari environment variable (.env / Vercel).
//
// CATATAN KEAMANAN: Vite menanamkan nilai VITE_* ke dalam bundle JavaScript
// yang dikirim ke browser, jadi email & password ini BISA dibaca pengunjung
// lewat view-source. Perlindungannya hanya menghalangi orang awam, bukan
// pengamanan sungguhan. Untuk pengamanan nyata, gunakan Firebase
// Authentication (lihat riwayat file ini) supaya password tidak pernah
// ikut ke sisi browser.
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const STORAGE_KEY = "isAdmin"

export const useAdminAuth = () => {
	const [isAdmin, setIsAdmin] = useState(false)
	const [checking, setChecking] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		try {
			setIsAdmin(localStorage.getItem(STORAGE_KEY) === "true")
		} catch {
			setIsAdmin(false)
		}
		setChecking(false)
	}, [])

	const login = async (email, password) => {
		setError("")

		if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
			setError(
				"VITE_ADMIN_EMAIL / VITE_ADMIN_PASSWORD belum diisi di .env (dan Environment Variables Vercel).",
			)
			return false
		}

		if (email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
			setError("Email atau password salah.")
			return false
		}

		try {
			localStorage.setItem(STORAGE_KEY, "true")
		} catch {
			// Kalau localStorage diblokir, sesi tetap jalan sampai halaman ditutup.
		}
		setIsAdmin(true)
		return true
	}

	const logout = () => {
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch {
			// abaikan
		}
		setIsAdmin(false)
	}

	// user disediakan supaya bentuk datanya tetap sama seperti sebelumnya.
	const user = isAdmin ? { email: ADMIN_EMAIL } : null

	return { user, isAdmin, checking, error, login, logout }
}
