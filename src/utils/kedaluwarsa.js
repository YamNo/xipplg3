import { db } from "../firebase"
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore"

export const hariIniStr = () => new Date().toLocaleDateString("sv-SE")

// Aturan kedaluwarsa per koleksi. Semua tanggal berformat YYYY-MM-DD sehingga
// bisa dibandingkan langsung sebagai string.
//
// mode "padaTanggal"  -> dihapus BEGITU tanggalnya tiba
//                        (deadline 2026-08-30 hilang pada 2026-08-30)
// mode "setelahTanggal" -> masih tampil sepanjang hari itu, hilang besoknya
//                        (acara 2026-09-01 masih tampil 1 Sep, hilang 2 Sep)
const ATURAN = {
	// Tugas: hilang tepat pada tanggal deadline-nya.
	assignments: { ambil: (d) => d.deadline, mode: "padaTanggal" },

	// Pengumuman: hanya kedaluwarsa kalau diberi tanggal hapus, dan hilang
	// tepat pada tanggal itu karena tanggalnya dipilih sendiri.
	announcements: { ambil: (d) => d.expiresAt, mode: "padaTanggal" },

	// Acara: kalau tanggal hapus diisi, pakai itu dan hilang pada tanggal
	// tersebut. Kalau tidak, pakai tanggal acaranya tapi tetap tampil
	// sepanjang hari-H supaya hitung mundur "berlangsung hari ini" kelihatan.
	events: (d) =>
		d.expiresAt
			? { batas: d.expiresAt, mode: "padaTanggal" }
			: { batas: d.date, mode: "setelahTanggal" },

	// Ulang tahun tidak pernah dihapus otomatis (berulang setiap tahun).
}

// Cek apakah satu dokumen sudah kedaluwarsa — dipakai juga untuk menyaring
// tampilan, supaya data langsung hilang tanpa menunggu penghapusan selesai.
export const sudahKedaluwarsa = (koleksi, data, hariIni = hariIniStr()) => {
	const aturan = ATURAN[koleksi]
	if (!aturan) return false

	const { batas, mode } =
		typeof aturan === "function" ? aturan(data) : { batas: aturan.ambil(data), mode: aturan.mode }

	if (!batas) return false
	return mode === "padaTanggal" ? batas <= hariIni : batas < hariIni
}

// Hapus semua dokumen kedaluwarsa. Aman dipanggil dari halaman mana pun;
// kalau gagal (misal rules menolak) cukup dicatat di console.
export const bersihkanKedaluwarsa = async () => {
	const hariIni = hariIniStr()
	let jumlah = 0

	for (const koleksi of Object.keys(ATURAN)) {
		try {
			const snap = await getDocs(collection(db, koleksi))
			const kedaluwarsa = snap.docs.filter((d) => sudahKedaluwarsa(koleksi, d.data(), hariIni))
			await Promise.all(kedaluwarsa.map((d) => deleteDoc(doc(db, koleksi, d.id))))
			jumlah += kedaluwarsa.length
		} catch (err) {
			console.error(`Gagal membersihkan ${koleksi}:`, err)
		}
	}

	if (jumlah > 0) console.log(`${jumlah} data kedaluwarsa dihapus otomatis.`)
	return jumlah
}
