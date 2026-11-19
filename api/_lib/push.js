// Kirim notifikasi push (Web Push) ke semua perangkat yang sudah menekan
// "Aktifkan Notifikasi" di website. Notifikasi ini muncul di HP/laptop
// walaupun website sedang tidak dibuka, seperti notifikasi aplikasi biasa.
//
// File di folder api/_lib tidak dijadikan endpoint oleh Vercel (awalan "_"),
// hanya dipakai bersama oleh endpoint lain.
//
// Environment variable:
//   VITE_VAPID_PUBLIC_KEY  kunci publik VAPID (juga dipakai browser)
//   VAPID_PRIVATE_KEY      kunci rahasia VAPID — TANPA awalan VITE_
//   VAPID_SUBJECT          opsional, default https://xipplg3.vercel.app
//
// Buat pasangan kunci baru dengan: npx web-push generate-vapid-keys

import webpush from "web-push"

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "websmkpplg3"
export const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const KOLEKSI_LANGGANAN = "push_subscriptions"

// Ubah field dokumen Firestore REST jadi objek biasa.
export const bacaField = (fields = {}) => {
	const out = {}
	for (const [k, v] of Object.entries(fields)) {
		out[k] = v.stringValue ?? v.integerValue ?? v.timestampValue ?? v.booleanValue ?? ""
	}
	return out
}

export const ambilKoleksi = async (koleksi) => {
	const hasil = []
	let pageToken = ""
	do {
		const r = await fetch(
			`${FS_BASE}/${koleksi}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
		)
		if (!r.ok) throw new Error(`Firestore ${r.status}: ${(await r.text()).slice(0, 200)}`)
		const j = await r.json()
		for (const d of j.documents || []) hasil.push({ nama: d.name, ...bacaField(d.fields) })
		pageToken = j.nextPageToken || ""
	} while (pageToken)
	return hasil
}

// Isi notifikasi untuk data baru di tiap koleksi.
export const isiNotif = (koleksi, d, id) => {
	if (koleksi === "assignments") {
		return {
			title: `📝 Tugas baru: ${d.subject}`,
			body: `${d.description ? `${d.description}\n` : ""}Deadline ${d.deadline}`,
			url: "/TugasPR",
			tag: `tugas-${id}`,
		}
	}
	if (koleksi === "announcements") {
		return { title: "📢 Pengumuman", body: d.text, url: "/", tag: `pengumuman-${id}` }
	}
	if (koleksi === "events") {
		return { title: `⏳ Acara: ${d.title}`, body: `Tanggal ${d.date}`, url: "/", tag: `acara-${id}` }
	}
	return null
}

export const kirimPushKeSemua = async ({ title, body = "", url = "/", tag }) => {
	const publik = process.env.VITE_VAPID_PUBLIC_KEY
	const rahasia = process.env.VAPID_PRIVATE_KEY
	if (!publik || !rahasia) return { terkirim: 0, info: "VAPID belum diatur" }

	webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://xipplg3.vercel.app", publik, rahasia)

	const daftar = (await ambilKoleksi(KOLEKSI_LANGGANAN)).filter((s) => s.endpoint && s.p256dh && s.auth)
	const payload = JSON.stringify({ title, body, url, tag })

	let terkirim = 0
	let dihapus = 0
	await Promise.all(
		daftar.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					payload,
					{ TTL: 60 * 60 * 24, urgency: "high" },
				)
				terkirim++
			} catch (err) {
				// 404/410 = langganan sudah tidak berlaku (notifikasi dimatikan,
				// aplikasi dihapus, dll). Buang supaya daftar tetap bersih.
				if (err.statusCode === 404 || err.statusCode === 410) {
					await fetch(`https://firestore.googleapis.com/v1/${s.nama}`, { method: "DELETE" }).catch(() => {})
					dihapus++
				} else {
					console.error("Push gagal:", err.statusCode, String(err.body || err.message).slice(0, 200))
				}
			}
		}),
	)

	return { terkirim, dihapus, total: daftar.length }
}
