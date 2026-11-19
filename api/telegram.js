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

import { ambilKoleksi, isiNotif, kirimPushKeSemua } from "./_lib/push.js"

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

✏️ Kelola data
/edit - ubah data yang sudah ada
/hapus - hapus data lewat tombol
/foto - foto yang menunggu persetujuan
/pelanggan - jumlah HP yang aktifkan notifikasi

Lainnya:
/daftar - lihat data yang sudah masuk
/bantuan - tampilkan pesan ini

Catatan:
• Tanggal memakai format TAHUN-BULAN-TANGGAL (2026-08-30).
• Tanda | memisahkan bagian.
• Tambahkan "hapus <tanggal>" di bagian terakhir untuk menentukan kapan
  data itu hilang sendiri dari web.
• Tugas otomatis hilang pada tanggal deadline-nya.
• Acara tanpa tanggal hapus akan hilang sehari setelah acaranya.
• /edit dan /hapus bisa langsung diberi jenisnya, mis. /hapus tugas`

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

// Balasan bisa berupa teks biasa atau objek { text, reply_markup, parse_mode }.
const kirimPesan = (chatId, balasan) =>
	panggilApi(
		"sendMessage",
		typeof balasan === "string" ? { chat_id: chatId, text: balasan } : { chat_id: chatId, ...balasan },
	)

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const potong = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const idDari = (nama) => String(nama || "").split("/").pop()

const nilai = (v) => {
	// Nilai yang sudah berbentuk Firestore (mis. { timestampValue }) dipakai apa adanya.
	if (v && typeof v === "object" && "timestampValue" in v) return v
	if (typeof v === "boolean") return { booleanValue: v }
	if (typeof v === "number") return { integerValue: String(v) }
	return { stringValue: String(v) }
}

const keFields = (data) =>
	Object.fromEntries(
		Object.entries(data)
			.filter(([, v]) => v !== undefined && v !== null)
			.map(([k, v]) => [k, nilai(v)]),
	)

const simpan = async (koleksi, data) => {
	const res = await fetch(`${FS_BASE}/${koleksi}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fields: keFields(data) }),
	})
	if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`)
	return res.json()
}

// Ubah beberapa field sekaligus. Field yang ada di `kolom` tapi tidak ada di
// `data` (atau bernilai null) dihapus dari dokumen.
const ubahDoc = async (path, kolom, data) => {
	const mask = kolom.map((f) => `updateMask.fieldPaths=${f}`).join("&")
	const res = await fetch(`${FS_BASE}/${path}?${mask}&currentDocument.exists=true`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ fields: keFields(data) }),
	})
	if (res.status === 404) throw new Error("DATA_HILANG")
	if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

const ambilDoc = async (path) => {
	const res = await fetch(`${FS_BASE}/${path}`)
	if (!res.ok) return null
	const out = {}
	for (const [k, v] of Object.entries((await res.json()).fields || {})) {
		out[k] = v.stringValue ?? v.integerValue ?? v.timestampValue ?? v.booleanValue ?? ""
	}
	return out
}

const hapusDoc = async (path) => {
	const res = await fetch(`${FS_BASE}/${path}`, { method: "DELETE" })
	if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

// Simpan data lalu kirim notifikasi push ke semua perangkat yang berlangganan.
// pushedAt ikut disimpan supaya /api/notify-push tidak mengirim ulang.
const simpanDanKabari = async (koleksi, data) => {
	const hasil = await simpan(koleksi, { ...data, pushedAt: { timestampValue: sekarangISO() } })
	const id = idDari(hasil.name)
	try {
		const { terkirim = 0 } = await kirimPushKeSemua(isiNotif(koleksi, data, id))
		return terkirim > 0 ? `\n🔔 Notifikasi terkirim ke ${terkirim} perangkat` : ""
	} catch (err) {
		console.error("Push gagal:", err)
		return "\n⚠️ Data tersimpan, tapi notifikasi gagal dikirim"
	}
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

// Pembaca format tiap jenis data. Dipakai saat menambah (/tugas, dst.) dan
// saat mengedit, jadi formatnya selalu sama. Hasil: { data } atau { error }.
const baca = {
	t(arg) {
		const bagian = pecah(arg)
		if (bagian.length < 2) {
			return {
				error:
					"❌ Format kurang lengkap.\nContoh:\nMatematika | kerjakan hal 42 | 2026-08-30\n\nMinimal: <mapel> | <tanggal>",
			}
		}
		// Tanggal selalu bagian terakhir; deskripsi opsional di tengah.
		const deadline = bagian[bagian.length - 1]
		if (!cekTanggal(deadline)) {
			return { error: `❌ Tanggal "${deadline}" tidak valid. Pakai format 2026-08-30 dan taruh di bagian terakhir.` }
		}
		return { data: { subject: bagian[0], description: bagian.slice(1, -1).join(" - "), deadline } }
	},

	p(arg) {
		const { bagian, expiresAt, salah } = pisahTanggalHapus(pecah(arg))
		if (salah) return { error: `❌ Tanggal hapus "${salah}" tidak valid. Contoh: hapus 2026-08-30` }
		const text = bagian.join(" | ").trim()
		if (!text) return { error: "❌ Isi pengumumannya belum ada.\nContoh:\nBesok ulangan Matematika" }
		return { data: { text, expiresAt } }
	},

	a(arg) {
		const { bagian, expiresAt, salah } = pisahTanggalHapus(pecah(arg))
		if (salah) return { error: `❌ Tanggal hapus "${salah}" tidak valid. Contoh: hapus 2026-09-10` }
		if (bagian.length < 2) return { error: "❌ Format kurang lengkap.\nContoh:\nClassmeet | 2026-09-01" }
		const date = bagian[bagian.length - 1]
		if (!cekTanggal(date)) return { error: `❌ Tanggal "${date}" tidak valid. Pakai format 2026-09-01.` }
		return { data: { title: bagian.slice(0, -1).join(" "), date, expiresAt } }
	},

	u(arg) {
		const bagian = pecah(arg)
		if (bagian.length < 2) return { error: "❌ Format kurang lengkap.\nContoh:\nBudi Santoso | 2010-05-17" }
		const date = bagian[bagian.length - 1]
		if (!cekTanggal(date)) return { error: `❌ Tanggal "${date}" tidak valid. Pakai format 2010-05-17.` }
		return { data: { name: bagian.slice(0, -1).join(" "), date } }
	},
}

// Jenis data yang bisa diedit/dihapus lewat bot. Kode 1 huruf dipakai di
// callback_data tombol (batas Telegram 64 byte).
const JENIS = {
	t: {
		koleksi: "assignments",
		nama: "tugas",
		kata: ["tugas", "pr"],
		kolom: ["subject", "description", "deadline"],
		urut: (d) => d.deadline || "",
		label: (d) => `${d.subject} — ${d.deadline}`,
		keTeks: (d) => [d.subject, d.description, d.deadline].filter(Boolean).join(" | "),
		contoh: "Matematika | kerjakan hal 42 | 2026-08-30",
	},
	p: {
		koleksi: "announcements",
		nama: "pengumuman",
		kata: ["pengumuman"],
		kolom: ["text", "expiresAt"],
		urut: (d) => d.createdAt || "",
		label: (d) => d.text,
		keTeks: (d) => `${d.text}${d.expiresAt ? ` | hapus ${d.expiresAt}` : ""}`,
		contoh: "Besok ulangan | hapus 2026-08-30",
	},
	a: {
		koleksi: "events",
		nama: "acara",
		kata: ["acara", "event"],
		kolom: ["title", "date", "expiresAt"],
		urut: (d) => d.date || "",
		label: (d) => `${d.title} — ${d.date}`,
		keTeks: (d) => `${d.title} | ${d.date}${d.expiresAt ? ` | hapus ${d.expiresAt}` : ""}`,
		contoh: "Classmeet | 2026-09-01",
	},
	u: {
		koleksi: "birthdays",
		nama: "ulang tahun",
		kata: ["ultah", "ulangtahun"],
		kolom: ["name", "date"],
		urut: (d) => (d.date || "").slice(5),
		label: (d) => `${d.name} — ${d.date}`,
		keTeks: (d) => `${d.name} | ${d.date}`,
		contoh: "Budi Santoso | 2010-05-17",
	},
}

const kodeDariKata = (kata) =>
	Object.keys(JENIS).find((k) => JENIS[k].kata.includes(String(kata).trim().toLowerCase()))

const AKSI = { h: { kata: "hapus", ikon: "🗑" }, e: { kata: "edit", ikon: "✏️" } }
const MAKS_TOMBOL = 40

// Tombol pilihan jenis data untuk /hapus dan /edit.
const tombolJenis = (aksi) => ({
	inline_keyboard: [
		[
			{ text: "📝 Tugas", callback_data: `k:${aksi}:t` },
			{ text: "📢 Pengumuman", callback_data: `k:${aksi}:p` },
		],
		[
			{ text: "⏳ Acara", callback_data: `k:${aksi}:a` },
			{ text: "🎂 Ulang tahun", callback_data: `k:${aksi}:u` },
		],
		[{ text: "Batal", callback_data: "x" }],
	],
})

// Daftar data bernomor, satu tombol per baris.
const daftarTombol = async (aksi, kode) => {
	const j = JENIS[kode]
	const semua = (await ambilKoleksi(j.koleksi)).sort((a, b) => String(j.urut(a)).localeCompare(String(j.urut(b))))
	if (semua.length === 0) {
		return { text: `Belum ada data ${j.nama}.`, reply_markup: { inline_keyboard: [[{ text: "⬅️ Kembali", callback_data: `k:${aksi}` }]] } }
	}
	const tampil = semua.slice(0, MAKS_TOMBOL)
	return {
		text:
			`${AKSI[aksi].ikon} Pilih ${j.nama} yang mau di${AKSI[aksi].kata}:` +
			(semua.length > tampil.length ? `\n(menampilkan ${tampil.length} dari ${semua.length})` : ""),
		reply_markup: {
			inline_keyboard: [
				...tampil.map((d, i) => [
					{
						text: `${AKSI[aksi].ikon} ${i + 1}. ${potong(j.label(d), 50)}`,
						callback_data: `${aksi}:${kode}:${idDari(d.nama)}`,
					},
				]),
				[
					{ text: "⬅️ Kembali", callback_data: `k:${aksi}` },
					{ text: "Batal", callback_data: "x" },
				],
			],
		},
	}
}

const tombolFoto = (id) => ({
	inline_keyboard: [
		[
			{ text: "✅ Setujui", callback_data: `foto_ok:${id}` },
			{ text: "🗑 Tolak", callback_data: `foto_no:${id}` },
		],
	],
})

// Penanda di pesan "balas untuk mengedit" supaya bot tahu data mana yang
// diedit saat pesannya dibalas (bot tidak menyimpan status percakapan).
const PENANDA_EDIT = /🔖 edit:([tpau]):([A-Za-z0-9_-]{1,64})/

const perintah = {
	async tugas(arg) {
		const { data, error } = baca.t(arg)
		if (error) return error.replace("Contoh:\n", "Contoh:\n/tugas ")
		const notif = await simpanDanKabari("assignments", { ...data, createdAt: { timestampValue: sekarangISO() } })
		return `✅ Tugas ditambahkan:\n📝 ${data.subject}\n${data.description || "(tanpa deskripsi)"}\n⏰ Deadline ${data.deadline}${notif}`
	},

	async pengumuman(arg) {
		const { data, error } = baca.p(arg)
		if (error) return error.replace("Contoh:\n", "Contoh:\n/pengumuman ")
		const notif = await simpanDanKabari("announcements", { ...data, createdAt: { timestampValue: sekarangISO() } })
		return `✅ Pengumuman ditambahkan:\n📢 ${data.text}\n${
			data.expiresAt ? `🗑 Hilang otomatis pada ${data.expiresAt}` : "🗑 Tidak dihapus otomatis"
		}${notif}`
	},

	async acara(arg) {
		const { data, error } = baca.a(arg)
		if (error) return error.replace("Contoh:\n", "Contoh:\n/acara ")
		const notif = await simpanDanKabari("events", data)
		return `✅ Acara ditambahkan:\n⏳ ${data.title}\n📅 ${data.date}\n${
			data.expiresAt ? `🗑 Hilang otomatis pada ${data.expiresAt}` : "🗑 Hilang sehari setelah acaranya"
		}${notif}`
	},

	async ultah(arg) {
		const { data, error } = baca.u(arg)
		if (error) return error.replace("Contoh:\n", "Contoh:\n/ultah ")
		await simpan("birthdays", data)
		return `✅ Ulang tahun ditambahkan:\n🎂 ${data.name}\n📅 ${data.date}`
	},

	async daftar() {
		const [tugas, pengumuman, acara, ultah] = await Promise.all([
			ambilKoleksi("assignments"),
			ambilKoleksi("announcements"),
			ambilKoleksi("events"),
			ambilKoleksi("birthdays"),
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

	async hapus(arg) {
		const kode = kodeDariKata(arg)
		if (arg.trim() && !kode) return `❓ Jenis "${arg.trim()}" tidak dikenal. Pakai: tugas, pengumuman, acara, ultah.`
		return kode ? daftarTombol("h", kode) : { text: "🗑 Mau hapus data apa?", reply_markup: tombolJenis("h") }
	},

	async edit(arg) {
		const kode = kodeDariKata(arg)
		if (arg.trim() && !kode) return `❓ Jenis "${arg.trim()}" tidak dikenal. Pakai: tugas, pengumuman, acara, ultah.`
		return kode ? daftarTombol("e", kode) : { text: "✏️ Mau edit data apa?", reply_markup: tombolJenis("e") }
	},

	async foto(_arg, { chatId }) {
		const pending = (await ambilKoleksi("images"))
			.filter((d) => d.status !== "approved" && d.url)
			.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
		if (pending.length === 0) return "✅ Tidak ada foto yang menunggu persetujuan."

		const tampil = pending.slice(0, 10)
		for (const d of tampil) {
			await panggilApi("sendPhoto", {
				chat_id: chatId,
				photo: d.url,
				caption: "🖼 Foto menunggu persetujuan",
				reply_markup: tombolFoto(idDari(d.nama)),
			})
		}
		return `📷 ${pending.length} foto menunggu persetujuan${
			pending.length > tampil.length ? ` (yang tampil ${tampil.length} terlama — kirim /foto lagi setelah memoderasi)` : ""
		}.`
	},

	async pelanggan() {
		const subs = await ambilKoleksi("push_subscriptions")
		return subs.length === 0
			? "🔕 Belum ada HP yang mengaktifkan notifikasi."
			: `🔔 ${subs.length} HP sudah mengaktifkan notifikasi.\nSemuanya akan menerima notif saat ada tugas, pengumuman, atau acara baru.`
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
	ubah: "edit",
	pending: "foto",
	subscriber: "pelanggan",
}

// --- Tombol (callback_query) ---
const tanganiTombol = async (cb) => {
	const jawab = (text) => panggilApi("answerCallbackQuery", { callback_query_id: cb.id, text })
	const chatId = cb.message?.chat?.id
	const messageId = cb.message?.message_id
	const ubahPesan = (isi) =>
		panggilApi("editMessageText", { chat_id: chatId, message_id: messageId, ...isi })
	const data = String(cb.data || "")

	// Setujui / Tolak foto.
	const foto = data.match(/^foto_(ok|no):([A-Za-z0-9_-]{1,64})$/)
	if (foto) {
		const [, aksi, id] = foto
		try {
			if (aksi === "ok") {
				await ubahDoc(`images/${id}`, ["status"], { status: "approved" })
				await jawab("✅ Foto disetujui")
			} else {
				await hapusDoc(`images/${id}`)
				await jawab("🗑 Foto ditolak & dihapus")
			}
			// Hilangkan tombolnya dan tandai hasilnya di caption.
			await panggilApi("editMessageCaption", {
				chat_id: chatId,
				message_id: messageId,
				caption:
					aksi === "ok"
						? "✅ Foto DISETUJUI — sudah tampil di Class Gallery."
						: "🗑 Foto DITOLAK — sudah dihapus dari database.",
				reply_markup: { inline_keyboard: [] },
			})
		} catch (err) {
			console.error("Gagal memoderasi foto:", err)
			await jawab(err.message === "DATA_HILANG" ? "Foto sudah tidak ada." : "❌ Gagal: " + String(err.message).slice(0, 150))
		}
		return
	}

	if (data === "x") {
		await ubahPesan({ text: "Dibatalkan.", reply_markup: { inline_keyboard: [] } })
		return jawab("")
	}

	// k:<aksi> -> pilih jenis lagi, k:<aksi>:<kode> -> tampilkan daftar.
	const kat = data.match(/^k:([he])(?::([tpau]))?$/)
	if (kat) {
		const [, aksi, kode] = kat
		await ubahPesan(
			kode
				? await daftarTombol(aksi, kode)
				: { text: aksi === "h" ? "🗑 Mau hapus data apa?" : "✏️ Mau edit data apa?", reply_markup: tombolJenis(aksi) },
		)
		return jawab("")
	}

	// h:/hy:/e:<kode>:<id>
	const item = data.match(/^(h|hy|e):([tpau]):([A-Za-z0-9_-]{1,64})$/)
	if (!item) return jawab("Tombol tidak dikenal.")
	const [, aksi, kode, id] = item
	const j = JENIS[kode]
	const d = await ambilDoc(`${j.koleksi}/${id}`)
	if (!d) {
		await ubahPesan(await daftarTombol(aksi === "e" ? "e" : "h", kode))
		return jawab("Data itu sudah tidak ada.")
	}

	if (aksi === "h") {
		await ubahPesan({
			text: `🗑 Yakin hapus ${j.nama} ini?\n\n${j.label(d)}`,
			reply_markup: {
				inline_keyboard: [
					[
						{ text: "Ya, hapus", callback_data: `hy:${kode}:${id}` },
						{ text: "⬅️ Tidak", callback_data: `k:h:${kode}` },
					],
				],
			},
		})
		return jawab("")
	}

	if (aksi === "hy") {
		await hapusDoc(`${j.koleksi}/${id}`)
		await ubahPesan({
			text: `✅ ${j.nama[0].toUpperCase()}${j.nama.slice(1)} dihapus:\n${j.label(d)}`,
			reply_markup: { inline_keyboard: [[{ text: `🗑 Hapus ${j.nama} lain`, callback_data: `k:h:${kode}` }]] },
		})
		return jawab("Dihapus")
	}

	// aksi === "e": minta data baru lewat balasan.
	await ubahPesan({ text: `✏️ Mengedit ${j.nama}: ${j.label(d)}`, reply_markup: { inline_keyboard: [] } })
	await kirimPesan(chatId, {
		parse_mode: "HTML",
		text:
			`✏️ <b>Edit ${escapeHtml(j.nama)}</b>\n\n` +
			`Data sekarang (ketuk untuk menyalin):\n<code>${escapeHtml(j.keTeks(d))}</code>\n\n` +
			`<b>Balas pesan ini</b> dengan data baru, formatnya sama seperti saat menambah.\n` +
			`🔖 edit:${kode}:${id}`,
		reply_markup: { force_reply: true, input_field_placeholder: potong(j.contoh, 64) },
	})
	return jawab("")
}

// Balasan ke pesan "✏️ Edit ..." -> simpan perubahan.
const tanganiBalasanEdit = async (penanda, teks) => {
	const [, kode, id] = penanda
	const j = JENIS[kode]
	const { data, error } = baca[kode](teks)
	if (error) return `${error}\n\nBalas lagi pesan edit tadi dengan format yang benar.`
	try {
		await ubahDoc(`${j.koleksi}/${id}`, j.kolom, data)
	} catch (err) {
		if (err.message === "DATA_HILANG") return `❌ ${j.nama} itu sudah dihapus, jadi tidak bisa diedit.`
		throw err
	}
	return `✅ ${j.nama[0].toUpperCase()}${j.nama.slice(1)} diperbarui:\n${j.label({ ...data })}${
		data.expiresAt ? `\n🗑 Hilang otomatis pada ${data.expiresAt}` : ""
	}`
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

	const diizinkan = (process.env.TELEGRAM_ALLOWED_IDS || "")
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean)

	// --- Tombol ---
	const cb = req.body?.callback_query
	if (cb) {
		if (!diizinkan.includes(String(cb.from?.id))) {
			await panggilApi("answerCallbackQuery", {
				callback_query_id: cb.id,
				text: "⛔ Kamu tidak punya izin memakai tombol ini.",
			})
			return res.status(200).json({ ok: true })
		}
		try {
			await tanganiTombol(cb)
		} catch (err) {
			console.error("Gagal memproses tombol:", err)
			await panggilApi("answerCallbackQuery", {
				callback_query_id: cb.id,
				text: "❌ Gagal: " + String(err.message).slice(0, 150),
			})
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

		// Balasan ke pesan edit dari bot.
		const penanda = pesan.reply_to_message?.from?.is_bot
			? String(pesan.reply_to_message.text || "").match(PENANDA_EDIT)
			: null
		if (penanda && !teks.startsWith("/")) {
			await kirimPesan(chatId, await tanganiBalasanEdit(penanda, teks))
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

		await kirimPesan(chatId, await fn(arg, { chatId }))
		return res.status(200).json({ ok: true })
	} catch (err) {
		console.error("Gagal memproses perintah:", err)
		await kirimPesan(chatId, `❌ Terjadi kesalahan di server:\n${String(err.message).slice(0, 300)}`)
		return res.status(200).json({ ok: true })
	}
}
