import { useEffect, useState } from "react"
import { db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { DEFAULT_JADWAL, HARI } from "../data/defaults"

// Kartu "Pelajaran sekarang" di beranda: membaca hari & jam perangkat, lalu
// mencocokkannya dengan jadwal hari itu (Firestore, cadangan: jadwal bawaan).

const UPDATE_MS = 30 * 1000

// "07.30-08.50" -> { mulai: 450, selesai: 530 } dalam menit sejak 00.00.
const parseWaktu = (time = "") => {
	const m = time.match(/(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/)
	if (!m) return null
	return { mulai: +m[1] * 60 + +m[2], selesai: +m[3] * 60 + +m[4] }
}

const jam = (menit) =>
	`${String(Math.floor(menit / 60)).padStart(2, "0")}.${String(menit % 60).padStart(2, "0")}`

const durasi = (menit) => {
	const j = Math.floor(menit / 60)
	const m = menit % 60
	if (j === 0) return `${m} menit`
	return m === 0 ? `${j} jam` : `${j} jam ${m} menit`
}

const hariDari = (tanggal) => HARI[tanggal.getDay() - 1] // Minggu (0) & Sabtu (6) -> undefined

const PelajaranSekarang = () => {
	const [now, setNow] = useState(() => new Date())
	const hariKey = hariDari(now)
	const [jadwal, setJadwal] = useState({})

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), UPDATE_MS)
		return () => clearInterval(timer)
	}, [])

	// Ambil ulang kalau harinya berganti (misalnya tab dibiarkan terbuka semalaman).
	useEffect(() => {
		if (!hariKey) return
		let batal = false
		getDoc(doc(db, "schedule", hariKey))
			.then((snap) => {
				const items = snap.exists() ? snap.data().items : null
				if (!batal && Array.isArray(items)) setJadwal((prev) => ({ ...prev, [hariKey]: items }))
			})
			.catch((err) => console.error("Gagal mengambil jadwal:", err))
		return () => {
			batal = true
		}
	}, [hariKey])

	if (!hariKey) return null

	const slot = (jadwal[hariKey] || DEFAULT_JADWAL[hariKey] || [])
		.map((it) => ({ ...it, ...parseWaktu(it.time) }))
		.filter((it) => it.mulai != null && it.selesai > it.mulai)
		.sort((a, b) => a.mulai - b.mulai)
	if (slot.length === 0) return null

	const menit = now.getHours() * 60 + now.getMinutes()
	const sekarang = slot.find((s) => menit >= s.mulai && menit < s.selesai)
	const berikutnya = slot.find((s) => !s.isBreak && s.mulai >= (sekarang ? sekarang.selesai : menit))
	const terakhir = slot[slot.length - 1]

	let isi
	if (menit >= terakhir.selesai) {
		isi = (
			<>
				<p className="text-sm font-semibold">✅ Pelajaran hari ini sudah selesai</p>
				<p className="text-xs opacity-70 mt-1">Selesai pukul {jam(terakhir.selesai)}. Jangan lupa cek Tugas & PR!</p>
			</>
		)
	} else if (sekarang) {
		const total = sekarang.selesai - sekarang.mulai
		const lewat = menit - sekarang.mulai
		isi = (
			<>
				<p className="text-xs opacity-60 uppercase tracking-wider">
					{sekarang.isBreak ? "☕ Sekarang" : "📚 Sekarang"}
				</p>
				<p className="text-base font-semibold mt-1 break-words">{sekarang.subject}</p>
				<p className="text-xs opacity-70 mt-1">
					{jam(sekarang.mulai)}–{jam(sekarang.selesai)} · sisa {durasi(sekarang.selesai - menit)}
				</p>
				<div className="h-1.5 rounded-full bg-white/15 mt-2 overflow-hidden">
					<div className="h-full bg-white rounded-full" style={{ width: `${(lewat / total) * 100}%` }}></div>
				</div>
				{berikutnya && (
					<p className="text-xs opacity-70 mt-3 break-words">
						Berikutnya: <span className="font-semibold opacity-100">{berikutnya.subject}</span> (
						{jam(berikutnya.mulai)})
					</p>
				)}
			</>
		)
	} else {
		// Sebelum pelajaran pertama, atau di sela jadwal yang kosong.
		const nanti = berikutnya || slot.find((s) => s.mulai >= menit)
		isi = (
			<>
				<p className="text-xs opacity-60 uppercase tracking-wider">⏰ Berikutnya</p>
				<p className="text-base font-semibold mt-1 break-words">{nanti.subject}</p>
				<p className="text-xs opacity-70 mt-1">
					Mulai {jam(nanti.mulai)} · {durasi(nanti.mulai - menit)} lagi
				</p>
			</>
		)
	}

	return <div className="InfoCard text-white w-full max-w-md">{isi}</div>
}

export default PelajaranSekarang
