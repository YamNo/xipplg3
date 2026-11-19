// Pengingat harian lewat notifikasi push, dijalankan otomatis oleh Vercel Cron
// (lihat "crons" di vercel.json) sekitar jam 06.00 WIB:
//  - tugas yang deadline-nya BESOK
//  - acara yang berlangsung hari ini
//  - ulang tahun hari ini
//
// Vercel mengirim header "Authorization: Bearer <CRON_SECRET>". Kalau
// CRON_SECRET belum diatur, endpoint ini menolak semua permintaan.

import { ambilKoleksi, kirimPushKeSemua } from "./_lib/push.js"

// Tanggal YYYY-MM-DD menurut WIB (UTC+7), digeser sejumlah hari.
const tanggalWIB = (geserHari = 0) =>
	new Date(Date.now() + 7 * 3600e3 + geserHari * 86400e3).toISOString().slice(0, 10)

export default async function handler(req, res) {
	const rahasia = process.env.CRON_SECRET
	if (!rahasia) return res.status(503).json({ ok: false, error: "CRON_SECRET belum diatur" })
	if (req.headers.authorization !== `Bearer ${rahasia}`) {
		return res.status(401).json({ ok: false, error: "tidak diizinkan" })
	}

	try {
		const hariIni = tanggalWIB(0)
		const besok = tanggalWIB(1)

		const [tugas, acara, ultah] = await Promise.all([
			ambilKoleksi("assignments"),
			ambilKoleksi("events"),
			ambilKoleksi("birthdays"),
		])

		const notif = []

		const tugasBesok = tugas.filter((t) => t.deadline === besok)
		if (tugasBesok.length > 0) {
			notif.push({
				title: tugasBesok.length === 1 ? "⏰ Deadline besok" : `⏰ ${tugasBesok.length} tugas deadline besok`,
				body: tugasBesok.map((t) => `${t.subject}${t.description ? ` — ${t.description}` : ""}`).join("\n"),
				url: "/TugasPR",
				tag: `deadline-${besok}`,
			})
		}

		for (const a of acara.filter((a) => a.date === hariIni)) {
			notif.push({ title: `🎉 Hari ini: ${a.title}`, body: "Jangan sampai lupa ya!", url: "/", tag: `acara-hari-${hariIni}` })
		}

		const yangUltah = ultah.filter((u) => (u.date || "").slice(5) === hariIni.slice(5))
		if (yangUltah.length > 0) {
			notif.push({
				title: "🎂 Ulang tahun hari ini",
				body: `Selamat ulang tahun ${yangUltah.map((u) => u.name).join(", ")}!`,
				url: "/",
				tag: `ultah-${hariIni}`,
			})
		}

		const hasil = []
		for (const n of notif) hasil.push(await kirimPushKeSemua(n))

		return res.status(200).json({ ok: true, hariIni, notif: notif.length, hasil })
	} catch (err) {
		console.error("cron-pengingat gagal:", err)
		return res.status(500).json({ ok: false, error: String(err.message).slice(0, 200) })
	}
}
