// Langganan notifikasi push dari sisi browser. Data langganan disimpan di
// koleksi Firestore "push_subscriptions", lalu server (api/_lib/push.js)
// mengirim notifikasi ke semua perangkat di koleksi itu.

import { db } from "../firebase"
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore"

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export const pushDidukung = () =>
	typeof window !== "undefined" &&
	"serviceWorker" in navigator &&
	"PushManager" in window &&
	"Notification" in window &&
	!!PUBLIC_KEY

// iPhone/iPad hanya bisa menerima push kalau website dipasang ke Layar Utama
// dan dibuka dari ikonnya.
export const iosBelumDipasang = () =>
	/iphone|ipad|ipod/i.test(navigator.userAgent) &&
	!window.matchMedia("(display-mode: standalone)").matches &&
	!navigator.standalone

const keUint8 = (base64) => {
	const pad = "=".repeat((4 - (base64.length % 4)) % 4)
	const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
	return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// Id dokumen = hash endpoint, supaya satu perangkat = satu dokumen.
const idDari = async (endpoint) => {
	const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint))
	return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")
}

const swSiap = () =>
	Promise.race([
		navigator.serviceWorker.ready,
		new Promise((_, tolak) =>
			setTimeout(() => tolak(new Error("Service worker belum aktif. Muat ulang halaman lalu coba lagi.")), 10000),
		),
	])

const simpan = async (sub) => {
	const { endpoint, keys } = sub.toJSON()
	await setDoc(doc(db, "push_subscriptions", await idDari(endpoint)), {
		endpoint,
		p256dh: keys.p256dh,
		auth: keys.auth,
		createdAt: serverTimestamp(),
	})
}

export const ambilLangganan = async () => {
	if (!pushDidukung()) return null
	const reg = await navigator.serviceWorker.getRegistration()
	return reg ? reg.pushManager.getSubscription() : null
}

export const aktifkanPush = async () => {
	const izin = await Notification.requestPermission()
	if (izin !== "granted") throw new Error("Izin notifikasi tidak diberikan.")

	const reg = await swSiap()
	const sub =
		(await reg.pushManager.getSubscription()) ||
		(await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keUint8(PUBLIC_KEY) }))
	await simpan(sub)
}

export const matikanPush = async () => {
	const sub = await ambilLangganan()
	if (!sub) return
	await deleteDoc(doc(db, "push_subscriptions", await idDari(sub.endpoint))).catch(() => {})
	await sub.unsubscribe()
}

// Simpan ulang langganan yang sudah ada (kalau browser memperbaruinya atau
// datanya terhapus dari server). Dipanggil diam-diam saat halaman dibuka.
export const sinkronkanPush = async () => {
	if (!pushDidukung() || Notification.permission !== "granted") return false
	const sub = await ambilLangganan()
	if (!sub) return false
	await simpan(sub).catch(() => {})
	return true
}

// Minta server mengirim notifikasi untuk data yang baru ditambahkan admin.
export const kabariPush = (koleksi, id) =>
	fetch("/api/notify-push", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ koleksi, id }),
	}).catch((err) => console.error("Gagal mengirim notifikasi push:", err))
