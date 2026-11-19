// Kirim notifikasi push untuk data yang baru ditambahkan lewat panel admin.
//
//   POST /api/notify-push   body: { koleksi: "assignments", id: "<id dokumen>" }
//
// Dipanggil dari browser, jadi tidak bisa menyimpan rahasia. Pengamanannya:
//  - koleksi dibatasi ke tugas, pengumuman, dan acara;
//  - dokumennya harus benar-benar ada, dan isi notifikasi diambil dari
//    dokumen itu (bukan dari permintaan), jadi tidak bisa mengirim teks bebas;
//  - setiap dokumen hanya bisa memicu notifikasi SATU kali (ditandai pushedAt).

import { FS_BASE, bacaField, isiNotif, kirimPushKeSemua } from "./_lib/push.js"

const KOLEKSI_BOLEH = ["assignments", "announcements", "events"]

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ ok: false, error: "hanya POST" })
	}

	const koleksi = String(req.body?.koleksi || "")
	const id = String(req.body?.id || "").trim()
	if (!KOLEKSI_BOLEH.includes(koleksi)) {
		return res.status(400).json({ ok: false, error: "koleksi tidak valid" })
	}
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
		return res.status(400).json({ ok: false, error: "id tidak valid" })
	}

	try {
		const docRes = await fetch(`${FS_BASE}/${koleksi}/${id}`)
		if (!docRes.ok) return res.status(404).json({ ok: false, error: "data tidak ditemukan" })

		const fields = (await docRes.json()).fields || {}
		if (fields.pushedAt) {
			return res.status(200).json({ ok: true, terkirim: 0, info: "notifikasi sudah pernah dikirim" })
		}

		// Tandai dulu sebelum mengirim, supaya panggilan ulang tidak mengirim dobel.
		const tandai = await fetch(
			`${FS_BASE}/${koleksi}/${id}?updateMask.fieldPaths=pushedAt&currentDocument.exists=true`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fields: { pushedAt: { timestampValue: new Date().toISOString() } } }),
			},
		)
		if (!tandai.ok) throw new Error(`Firestore ${tandai.status}: ${(await tandai.text()).slice(0, 200)}`)

		const hasil = await kirimPushKeSemua(isiNotif(koleksi, bacaField(fields), id))
		return res.status(200).json({ ok: true, ...hasil })
	} catch (err) {
		console.error("notify-push gagal:", err)
		return res.status(500).json({ ok: false, error: String(err.message).slice(0, 200) })
	}
}
