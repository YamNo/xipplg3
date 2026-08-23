import { useEffect, useState } from "react"
import { auth, db } from "../firebase"
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

// Status admin ditentukan oleh keberadaan dokumen admins/{uid} di Firestore,
// bukan oleh password di kode. Ini juga yang dipakai Firestore rules, jadi
// orang yang tidak terdaftar tidak bisa menulis data meski lewat API langsung.
export const useAdminAuth = () => {
	const [user, setUser] = useState(null)
	const [isAdmin, setIsAdmin] = useState(false)
	const [checking, setChecking] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (current) => {
			setUser(current)

			if (!current) {
				setIsAdmin(false)
				setChecking(false)
				return
			}

			try {
				const snap = await getDoc(doc(db, "admins", current.uid))
				setIsAdmin(snap.exists())
				if (!snap.exists()) {
					setError(
						`Akun ${current.email} belum terdaftar sebagai admin. ` +
							`Tambahkan dokumen dengan ID "${current.uid}" di koleksi "admins".`,
					)
				}
			} catch (err) {
				console.error("Gagal memeriksa status admin:", err)
				setIsAdmin(false)
				setError("Gagal memeriksa status admin. Cek koneksi lalu coba lagi.")
			} finally {
				setChecking(false)
			}
		})

		return () => unsubscribe()
	}, [])

	const login = async (email, password) => {
		setError("")
		try {
			await signInWithEmailAndPassword(auth, email.trim(), password)
			return true
		} catch (err) {
			const pesan = {
				"auth/invalid-credential": "Email atau password salah.",
				"auth/invalid-email": "Format email tidak valid.",
				"auth/user-not-found": "Akun tidak ditemukan.",
				"auth/wrong-password": "Password salah.",
				"auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
				"auth/operation-not-allowed":
					"Login Email/Password belum diaktifkan di Firebase Console (Authentication → Sign-in method).",
			}
			setError(pesan[err.code] || `Gagal login: ${err.code}`)
			return false
		}
	}

	const logout = () => signOut(auth)

	return { user, isAdmin, checking, error, login, logout }
}
