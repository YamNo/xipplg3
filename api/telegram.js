// Webhook bot Telegram untuk mengisi data website dari chat.
//
// Environment variable yang dipakai (di Vercel, TANPA awalan VITE_ supaya
// tidak ikut ke bundle browser):
//   TELEGRAM_BOT_TOKEN   token dari @BotFather
//   TELEGRAM_SECRET      token rahasia yang dicocokkan dengan header webhook
//   TELEGRAM_ALLOWED_IDS daftar user id Telegram yang boleh mengisi data,
//                        dipisah koma. Kalau kosong, bot hanya membalas dengan
//                        id pengirim supaya bisa didaftarkan.
//   FIREBASE_PROJECT_ID  id project Firestore (default: websmkpplg3)

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "websmkpplg3"
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const BANTUAN = `Halo! Kirim salah satu perintah berikut:

📝 Tugas/PR
/tugas Matematika | kerjakan hal 42 | 2026-08-30

📢 Pengumuman
/pengumuman Besok ulangan Matematika
/pengumuman Besok ulangan | hapus 2026-08-30

⏳ Acara (countdown)
/acara Classmeet | 2026-09-01
/acara Classmeet | 2026-09-01 | hapus 2026-09-10

🎂 Ulang tahun
/ultah Budi Santoso | 2010-05-17

Lainnya:
/daftar - lihat data yang sudah masuk
/bantuan - tampilkan pesan ini

Catatan:
• Tanggal memakai format TAHUN-BULAN-TANGGAL (2026-08-30).
• Tanda | memisahkan bagian.
• Tambahkan "hapus <tanggal>" di bagian terakhir untuk menentukan kapan
  data itu hilang sendiri dari web.
• Tugas otomatis hilang pada tanggal deadline-nya.
• Acara tanpa tanggal hapus akan hilang sehari setelah acaranya.`

const panggilApi = async (metode, body) => {
	const token = process.env.TELEGRAM_BOT_TOKEN
	if (!token) return null
	const res = await fetch(`https://api.telegram.org/bot${token}/${metode}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	})
	if (!res.ok) console.error(`Telegram ${metode} gagal:`, (await res.text()).slice(0, 200))
	return res
}

const kirimPesan = (chatId, text) => panggilApi("sendMessage", { chat_id: chatId, text })

const nilai = (v) => {
	if (typeof v === "boolean") return { booleanValue: v }
	if (typeof v === "number") return { integerValue: String(v) }
	return { stringValue: String(v) }
}

const simpan = async (koleksi, data) => {
	const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, nilai(v)]))
	const res = await fetch(`${FS_BASE}/${koleksi}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fields }),
	})
	if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`)
	return res.json()
}

// Ubah satu field dokumen tanpa menyentuh field lainnya.
const ubahField = async (path, field, value) => {
	const res = await fetch(`${FS_BASE}/${path}?updateMask.fieldPaths=${field}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fields: { [field]: nilai(value) } }),
	})
	if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

const hapusDoc = async (path) => {
	const res = await fetch(`${FS_BASE}/${path}`, { method: "DELETE" })
	if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

const ambil = async (koleksi) => {
	const res = await fetch(`${FS_BASE}/${koleksi}?pageSize=100`)
	if (!res.ok) return []
	const json = await res.json()
	return (json.documents || []).map((d) => {
		const out = {}
		for (const [k, v] of Object.entries(d.fields || {})) {
			out[k] = v.stringValue ?? v.integerValue ?? v.timestampValue ?? v.booleanValue ?? ""
		}
		return out
	})
}

const cekTanggal = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

const sekarangISO = () => new Date().toISOString()

// Pecah argumen berdasarkan "|" lalu buang spasi berlebih.
const pecah = (teks) =>
	teks
		.split("|")
		.map((x) => x.trim())
		.filter((x) => x.length > 0)

// Ambil bagian "hapus <tanggal>" dari daftar bagian, kalau ada.
// Mengembalikan { bagian: sisanya, expiresAt, salah }.
const pisahTanggalHapus = (bagian) => {
	const akhir = bagian[bagian.length - 1] || ""
	const m = akhir.match(/^hapus\s+(.+)$/i)
	if (!m) return { bagian, expiresAt: null, salah: null }
	const tgl = m[1].trim()
	if (!cekTanggal(tgl)) return { bagian, expiresAt: null, salah: tgl }
	return { bagian: bagian.slice(0, -1), expiresAt: tgl, salah: null }
}

const perintah = {
	async tugas(arg) {
		const bagian = pecah(arg)
		if (bagian.length < 2) {
			return "❌ Format kurang lengkap.\nContoh:\n/tugas Matematika | kerjakan hal 42 | 2026-08-30\n\nMinimal: /tugas <mapel> | <tanggal>"
		}
		// Tanggal selalu bagian terakhir; deskripsi opsional di tengah.
		const deadline = bagian[bagian.length - 1]
		if (!cekTanggal(deadline)) {
			return `❌ Tanggal "${deadline}" tidak valid. Pakai format 2026-08-30 dan taruh di bagian terakhir.`
		}
		const subject = bagian[0]
		const description = bagian.slice(1, -1).join(" - ")

		await simpan("assignments", {
			subject,
			description,
			deadline,
			createdAt: { timestampValue: sekarangISO() },
		})
		return `✅ Tugas ditambahkan:\n📝 ${subject}\n${description || "(tanpa deskripsi)"}\n⏰ Deadline ${deadline}`
	},

	async pengumuman(arg) {
		const { bagian, expiresAt, salah } = pisahTanggalHapus(pecah(arg))
		if (salah) return `❌ Tanggal hapus "${salah}" tidak valid. Contoh: hapus 2026-08-30`

		const teks = bagian.join(" | ").trim()
		if (!teks) return "❌ Isi pengumumannya belum ada.\nContoh:\n/pengumuman Besok ulangan Matematika"

		const data = { text: teks, createdAt: { timestampValue: sekarangISO() } }
		if (expiresAt) data.expiresAt = expiresAt

		await simpan("announcements", data)
		return `✅ Pengumuman ditambahkan:\n📢 ${teks}\n${
			expiresAt ? `🗑 Hilang otomatis pada ${expiresAt}` : "🗑 Tidak dihapus otomatis"
		}`
	},

	async acara(arg) {
		const { bagian, expiresAt, salah } = pisahTanggalHapus(pecah(arg))
		if (salah) return `❌ Tanggal hapus "${salah}" tidak valid. Contoh: hapus 2026-09-10`

		if (bagian.length < 2) return "❌ Format kurang lengkap.\nContoh:\n/acara Classmeet | 2026-09-01"
		const date = bagian[bagian.length - 1]
		if (!cekTanggal(date)) return `❌ Tanggal "${date}" tidak valid. Pakai format 2026-09-01.`

		const title = bagian.slice(0, -1).join(" ")
		const data = { title, date }
		if (expiresAt) data.expiresAt = expiresAt

		await simpan("events", data)
		return `✅ Acara ditambahkan:\n⏳ ${title}\n📅 ${date}\n${
			expiresAt ? `🗑 Hilang otomatis pada ${expiresAt}` : "🗑 Hilang sehari setelah acaranya"
		}`
	},

	async ultah(arg) {
		const bagian = pecah(arg)
		if (bagian.length < 2) return "❌ Format kurang lengkap.\nContoh:\n/ultah Budi Santoso | 2010-05-17"
		const date = bagian[bagian.length - 1]
		if (!cekTanggal(date)) return `❌ Tanggal "${date}" tidak valid. Pakai format 2010-05-17.`
		const name = bagian.slice(0, -1).join(" ")
		await simpan("birthdays", { name, date })
		return `✅ Ulang tahun ditambahkan:\n🎂 ${name}\n📅 ${date}`
	},

	async daftar() {
		const [tugas, pengumuman, acara, ultah] = await Promise.all([
			ambil("assignments"),
			ambil("announcements"),
			ambil("events"),
			ambil("birthdays"),
		])

		const baris = (arr, format) =>
			arr.length === 0 ? "  (kosong)" : arr.map((x) => `  • ${format(x)}`).join("\n")

		return [
			`📝 Tugas (${tugas.length})`,
			baris(tugas, (t) => `${t.subject} — ${t.deadline}`),
			"",
			`📢 Pengumuman (${pengumuman.length})`,
			baris(pengumuman, (p) => `${p.text}${p.expiresAt ? ` (hapus ${p.expiresAt})` : ""}`),
			"",
			`⏳ Acara (${acara.length})`,
			baris(acara, (a) => `${a.title} — ${a.date}${a.expiresAt ? ` (hapus ${a.expiresAt})` : ""}`),
			"",
			`🎂 Ulang tahun (${ultah.length})`,
			baris(ultah, (u) => `${u.name} — ${u.date}`),
		].join("\n")
	},

	async bantuan() {
		return BANTUAN
	},
}

// Alias supaya lebih gampang diingat.
const alias = {
	start: "bantuan",
	help: "bantuan",
	pr: "tugas",
	list: "daftar",
	info: "daftar",
	ulangtahun: "ultah",
	event: "acara",
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(200).json({ ok: true, info: "Webhook bot Telegram aktif." })
	}

	// Pastikan permintaan benar-benar dari Telegram, bukan orang yang menebak URL.
	// Gagal-tertutup: kalau secret belum diset, tolak semuanya daripada
	// membiarkan endpoint terbuka.
	const rahasia = process.env.TELEGRAM_SECRET
	if (!rahasia) {
		return res.status(503).json({ ok: false, error: "TELEGRAM_SECRET belum diatur" })
	}
	if (req.headers["x-telegram-bot-api-secret-token"] !== rahasia) {
		return res.status(401).json({ ok: false, error: "secret tidak cocok" })
	}

	const diizinkanGlobal = (process.env.TELEGRAM_ALLOWED_IDS || "")
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)

	// --- Tombol Setujui / Tolak pada foto yang menunggu moderasi ---
	const cb = req.body?.callback_query
	if (cb) {
		const jawab = (text) => panggilApi("answerCallbackQuery", { callback_query_id: cb.id, text })

		if (!diizinkanGlobal.includes(String(cb.from?.id))) {
			await jawab("⛔ Kamu tidak punya izin memoderasi.")
			return res.status(200).json({ ok: true })
		}

		const cocok = String(cb.data || "").match(/^foto_(ok|no):([A-Za-z0-9_-]{1,64})$/)
		if (!cocok) {
			await jawab("Tombol tidak dikenal.")
			return res.status(200).json({ ok: true })
		}

		const [, aksi, id] = cocok
		try {
			if (aksi === "ok") {
				await ubahField(`images/${id}`, "status", "approved")
				await jawab("✅ Foto disetujui")
			} else {
				await hapusDoc(`images/${id}`)
				await jawab("🗑 Foto ditolak & dihapus")
			}

			// Hilangkan tombolnya dan tandai hasilnya di caption.
			await panggilApi("editMessageCaption", {
				chat_id: cb.message.chat.id,
				message_id: cb.message.message_id,
				caption:
					aksi === "ok"
						? "✅ Foto DISETUJUI — sudah tampil di Class Gallery."
						: "🗑 Foto DITOLAK — sudah dihapus dari database.",
				reply_markup: { inline_keyboard: [] },
			})
		} catch (err) {
			console.error("Gagal memoderasi foto:", err)
			await jawab("❌ Gagal: " + String(err.message).slice(0, 150))
		}

		return res.status(200).json({ ok: true })
	}

	const pesan = req.body?.message || req.body?.edited_message
	const chatId = pesan?.chat?.id
	const userId = pesan?.from?.id
	const teks = (pesan?.text || "").trim()

	// Telegram akan mengirim ulang kalau kita balas error, jadi selalu balas 200.
	if (!chatId || !teks) return res.status(200).json({ ok: true })

	try {
		const diizinkan = diizinkanGlobal

		if (diizinkan.length === 0) {
			await kirimPesan(
				chatId,
				`⚠️ Bot belum punya daftar admin.\n\nUser ID kamu: ${userId}\n\nTambahkan angka itu ke environment variable TELEGRAM_ALLOWED_IDS di Vercel, lalu deploy ulang.`,
			)
			return res.status(200).json({ ok: true })
		}

		if (!diizinkan.includes(String(userId))) {
			await kirimPesan(chatId, `⛔ Kamu tidak punya izin memakai bot ini.\nUser ID kamu: ${userId}`)
			return res.status(200).json({ ok: true })
		}

		if (!teks.startsWith("/")) {
			await kirimPesan(chatId, `Kirim perintah yang diawali "/".\n\n${BANTUAN}`)
			return res.status(200).json({ ok: true })
		}

		// "/tugas@NamaBot argumen" -> nama = tugas, arg = argumen
		const spasi = teks.indexOf(" ")
		const mentah = (spasi === -1 ? teks.slice(1) : teks.slice(1, spasi)).toLowerCase()
		const nama = alias[mentah.split("@")[0]] || mentah.split("@")[0]
		const arg = spasi === -1 ? "" : teks.slice(spasi + 1)

		const fn = perintah[nama]
		if (!fn) {
			await kirimPesan(chatId, `❓ Perintah "/${nama}" tidak dikenal.\n\n${BANTUAN}`)
			return res.status(200).json({ ok: true })
		}

		await kirimPesan(chatId, await fn(arg))
		return res.status(200).json({ ok: true })
	} catch (err) {
		console.error("Gagal memproses perintah:", err)
		await kirimPesan(chatId, `❌ Terjadi kesalahan di server:\n${String(err.message).slice(0, 300)}`)
		return res.status(200).json({ ok: true })
	}
}
