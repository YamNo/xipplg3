import { useEffect, useState } from "react"

// Password admin dibaca dari environment variable (.env / Vercel).
// Login cukup pakai password, tanpa email.
//
// CATATAN KEAMANAN: Vite menanamkan nilai VITE_* ke dalam bundle JavaScript
// yang dikirim ke browser, jadi password ini BISA dibaca pengunjung
// lewat view-source. Perlindungannya hanya menghalangi orang awam, bukan
// pengamanan sungguhan. Untuk pengamanan nyata, gunakan Firebase
// Authentication (lihat riwayat file ini) supaya password tidak pernah
// ikut ke sisi browser.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const STORAGE_KEY = "adminSession"
// Sesi berakhir setelah 4 jam supaya panel tidak tetap terbuka kalau
// perangkatnya dipakai orang lain.
const SESSION_MS = 4 * 60 * 60 * 1000

export const useAdminAuth = () => {
	const [isAdmin, setIsAdmin] = useState(false)
	const [checking, setChecking] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		try {
			const kedaluwarsa = parseInt(localStorage.getItem(STORAGE_KEY), 10)
			if (kedaluwarsa && Date.now() < kedaluwarsa) {
				setIsAdmin(true)
			} else {
				// Bersihkan sesi lama sekaligus kunci versi lama (isAdmin).
				localStorage.removeItem(STORAGE_KEY)
				localStorage.removeItem("isAdmin")
				setIsAdmin(false)
			}
		} catch {
			setIsAdmin(false)
		}
		setChecking(false)
	}, [])

	// Tendang keluar otomatis saat sesi habis walau tab dibiarkan terbuka.
	useEffect(() => {
		if (!isAdmin) return
		let sisa = SESSION_MS
		try {
			const kedaluwarsa = parseInt(localStorage.getItem(STORAGE_KEY), 10)
			if (kedaluwarsa) sisa = Math.max(0, kedaluwarsa - Date.now())
		} catch {
			// pakai default
		}
		const timer = setTimeout(() => {
			try {
				localStorage.removeItem(STORAGE_KEY)
			} catch {
				// abaikan
			}
			setIsAdmin(false)
			setError("Sesi berakhir, silakan login lagi.")
		}, sisa)
		return () => clearTimeout(timer)
	}, [isAdmin])

	const login = async (password) => {
		setError("")

		if (!ADMIN_PASSWORD) {
			setError("VITE_ADMIN_PASSWORD belum diisi di .env (dan Environment Variables Vercel).")
			return false
		}

		if (password !== ADMIN_PASSWORD) {
			setError("Password salah.")
			return false
		}

		try {
			localStorage.setItem(STORAGE_KEY, String(Date.now() + SESSION_MS))
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
	const user = isAdmin ? { name: "Admin" } : null

	return { user, isAdmin, checking, error, login, logout }
}
