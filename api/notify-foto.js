// Kirim foto yang baru diunggah ke bot Telegram, lengkap dengan tombol
// Setujui / Tolak, supaya admin bisa memoderasi langsung dari chat.
//
// Dipanggil oleh website setelah upload berhasil:
//   POST /api/notify-foto   body: { id: "<id dokumen images>" }
//
// Endpoint ini dipanggil dari browser sehingga tidak bisa menyimpan rahasia.
// Pengamanannya: id yang dikirim WAJIB cocok dengan dokumen yang benar-benar
// ada di koleksi images dan masih berstatus "pending". Jadi endpoint ini tidak
// bisa dipakai mengirim pesan sembarangan ke Telegram.

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "websmkpplg3"
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ ok: false, error: "hanya POST" })
	}

	const token = process.env.TELEGRAM_BOT_TOKEN
	const tujuan = (process.env.TELEGRAM_ALLOWED_IDS || "")
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)

	if (!token || tujuan.length === 0) {
		// Bot belum diatur — bukan error bagi pengunggah, cukup dilewati.
		return res.status(200).json({ ok: true, terkirim: 0, info: "bot belum dikonfigurasi" })
	}

	const id = String(req.body?.id || "").trim()
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
		return res.status(400).json({ ok: false, error: "id tidak valid" })
	}

	try {
		// Pastikan dokumennya nyata dan memang menunggu persetujuan.
		const docRes = await fetch(`${FS_BASE}/images/${id}`)
		if (!docRes.ok) return res.status(404).json({ ok: false, error: "foto tidak ditemukan" })

		const fields = (await docRes.json()).fields || {}
		const url = fields.url?.stringValue
		const status = fields.status?.stringValue

		if (!url) return res.status(400).json({ ok: false, error: "dokumen tanpa url" })
		if (status !== "pending") {
			return res.status(200).json({ ok: true, terkirim: 0, info: "foto sudah dimoderasi" })
		}

		const caption =
			"🖼 Foto baru menunggu persetujuan\n\n" +
			"Setujui agar tampil di Class Gallery, atau tolak untuk menghapusnya."

		const tombol = {
			inline_keyboard: [
				[
					{ text: "✅ Setujui", callback_data: `foto_ok:${id}` },
					{ text: "🗑 Tolak", callback_data: `foto_no:${id}` },
				],
			],
		}

		let terkirim = 0
		for (const chatId of tujuan) {
			const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ chat_id: chatId, photo: url, caption, reply_markup: tombol }),
			})
			if (r.ok) terkirim++
			else console.error("Gagal kirim foto ke Telegram:", (await r.text()).slice(0, 200))
		}

		return res.status(200).json({ ok: true, terkirim })
	} catch (err) {
		console.error("notify-foto gagal:", err)
		return res.status(500).json({ ok: false, error: String(err.message).slice(0, 200) })
	}
}
