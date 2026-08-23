import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./PenghitungSkor.css"

const JUMLAH_PARTIKEL = 30

const PenghitungSkor = () => {
	const [mulai, setMulai] = useState(false)
	const [namaA, setNamaA] = useState("Team A")
	const [namaB, setNamaB] = useState("Team B")
	const [skorA, setSkorA] = useState(0)
	const [skorB, setSkorB] = useState(0)
	const [suaraAktif, setSuaraAktif] = useState(true)
	const [daftarSuara, setDaftarSuara] = useState([])
	const [indexSuara, setIndexSuara] = useState("")
	const [animasi, setAnimasi] = useState({ A: false, B: false })

	const audioCtxRef = useRef(null)

	// Posisi & durasi partikel dihitung sekali saja supaya tidak berubah
	// setiap komponen render ulang.
	const partikel = useMemo(
		() =>
			Array.from({ length: JUMLAH_PARTIKEL }, () => ({
				left: `${Math.random() * 100}%`,
				delay: `${Math.random() * 20}s`,
				duration: `${Math.random() * 15 + 15}s`,
			})),
		[],
	)

	// --- Suara (Web Speech API) ---
	useEffect(() => {
		if (typeof window === "undefined" || !window.speechSynthesis) return

		const muat = () => {
			const suara = window.speechSynthesis.getVoices()
			if (suara.length === 0) return
			setDaftarSuara(suara)

			// Prioritas: bahasa Indonesia -> suara natural/premium -> apa pun.
			const cariIndex = () => {
				const idxId = suara.findIndex(
					(v) => v.lang?.toLowerCase().includes("id") || v.name?.toLowerCase().includes("indonesia"),
				)
				if (idxId !== -1) return idxId
				const idxNatural = suara.findIndex((v) =>
					/natural|neural|premium|enhanced/i.test(v.name || ""),
				)
				return idxNatural !== -1 ? idxNatural : 0
			}
			setIndexSuara((sekarang) => (sekarang === "" ? String(cariIndex()) : sekarang))
		}

		muat()
		window.speechSynthesis.onvoiceschanged = muat
		return () => {
			window.speechSynthesis.onvoiceschanged = null
		}
	}, [])

	const suaraTerpilih = daftarSuara[parseInt(indexSuara, 10)] || null

	const ucapkan = useCallback(
		(teks, pitch = 1) => {
			if (!window.speechSynthesis || !suaraTerpilih) return
			const u = new SpeechSynthesisUtterance(teks)
			u.voice = suaraTerpilih
			u.lang = suaraTerpilih.lang || "id-ID"
			u.rate = 0.8
			u.pitch = pitch
			u.volume = 0.9
			u.onerror = (e) => {
				// "interrupted"/"canceled" wajar terjadi: pengumuman baru sengaja
				// membatalkan yang sedang berjalan.
				if (e.error !== "interrupted" && e.error !== "canceled") {
					console.error("Gagal membacakan suara:", e.error)
				}
			}
			window.speechSynthesis.cancel()
			window.speechSynthesis.speak(u)
		},
		[suaraTerpilih],
	)

	// --- Efek suara (Web Audio API) ---
	// AudioContext dibuat sekali lalu dipakai ulang; membuat baru setiap klik
	// bisa kena batas jumlah context di browser.
	const ambilAudioCtx = () => {
		const AC = window.AudioContext || window.webkitAudioContext
		if (!AC) return null
		if (!audioCtxRef.current) audioCtxRef.current = new AC()
		if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume()
		return audioCtxRef.current
	}

	const bunyiSkor = (tim, tambah = true) => {
		if (!suaraAktif) return
		const ctx = ambilAudioCtx()
		if (!ctx) return

		const nada = (freq, mulaiDetik, tipe, dari, sampai) => {
			const osc = ctx.createOscillator()
			const gain = ctx.createGain()
			osc.connect(gain)
			gain.connect(ctx.destination)
			osc.type = tipe
			osc.frequency.setValueAtTime(freq, ctx.currentTime + mulaiDetik)
			if (sampai) {
				osc.frequency.linearRampToValueAtTime(sampai, ctx.currentTime + mulaiDetik + 0.5)
			}
			gain.gain.setValueAtTime(dari, ctx.currentTime + mulaiDetik)
			gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + mulaiDetik + (sampai ? 0.5 : 0.3))
			osc.start(ctx.currentTime + mulaiDetik)
			osc.stop(ctx.currentTime + mulaiDetik + (sampai ? 0.5 : 0.3))
		}

		if (tambah) {
			const freqs = tim === "A" ? [800, 1000, 1200] : [600, 800, 1000]
			freqs.forEach((f, i) => nada(f, i * 0.1, "sine", 0.2))
		} else {
			nada(400, 0, "triangle", 0.3, 200)
		}
	}

	const bacakanSkor = (tim, a, b) => {
		if (!suaraAktif) return
		let teks
		if (a === b) teks = `Skor sama ${a}`
		else if (tim === "A") teks = `${namaA} ${a}, ${namaB} ${b}`
		else teks = `${namaB} ${b}, ${namaA} ${a}`
		ucapkan(teks)
	}

	const tambahSkor = (tim) => {
		const a = tim === "A" ? skorA + 1 : skorA
		const b = tim === "B" ? skorB + 1 : skorB
		if (tim === "A") setSkorA(a)
		else setSkorB(b)

		setAnimasi((p) => ({ ...p, [tim]: true }))
		setTimeout(() => setAnimasi((p) => ({ ...p, [tim]: false })), 600)

		bunyiSkor(tim, true)
		setTimeout(() => bacakanSkor(tim, a, b), 200)
	}

	const kurangiSkor = (tim) => {
		if (tim === "A" && skorA === 0) return
		if (tim === "B" && skorB === 0) return
		const a = tim === "A" ? skorA - 1 : skorA
		const b = tim === "B" ? skorB - 1 : skorB
		if (tim === "A") setSkorA(a)
		else setSkorB(b)

		bunyiSkor(tim, false)
		setTimeout(() => bacakanSkor(tim, a, b), 200)
	}

	const resetSkor = () => {
		setSkorA(0)
		setSkorB(0)
		setTimeout(() => suaraAktif && ucapkan("Skor telah direset ke nol"), 400)
	}

	const gameBaru = () => {
		setSkorA(0)
		setSkorB(0)
		setMulai(false)
	}

	const mulaiGame = () => {
		setNamaA(namaA.trim() || "Team A")
		setNamaB(namaB.trim() || "Team B")
		setMulai(true)
		setTimeout(() => suaraAktif && ucapkan("Pertandingan dimulai! Semoga beruntung!", 1.1), 800)
	}

	const testSuara = () => {
		if (!suaraTerpilih) {
			alert("Pilih suara terlebih dahulu!")
			return
		}
		ucapkan("Halo, ini adalah tes suara untuk pertandingan. Tim A nol, Tim B nol.")
	}

	// --- Pintasan keyboard, hanya saat pertandingan berjalan ---
	useEffect(() => {
		if (!mulai) return
		const onKey = (e) => {
			switch (e.key.toLowerCase()) {
				case "a": tambahSkor("A"); break
				case "b": tambahSkor("B"); break
				case "q": kurangiSkor("A"); break
				case "w": kurangiSkor("B"); break
				case "r": resetSkor(); break
				case "m": setSuaraAktif((v) => !v); break
				default: break
			}
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [mulai, skorA, skorB, suaraAktif, suaraTerpilih, namaA, namaB])

	// Hentikan suara yang sedang berjalan saat meninggalkan halaman.
	useEffect(() => () => window.speechSynthesis?.cancel(), [])

	// Kelompokkan pilihan suara supaya mudah dipilih.
	const grupSuara = useMemo(() => {
		const g = { indonesia: [], natural: [], inggris: [], lain: [] }
		daftarSuara.forEach((v, i) => {
			const nama = (v.name || "").toLowerCase()
			const lang = (v.lang || "").toLowerCase()
			if (lang.includes("id") || nama.includes("indonesia")) g.indonesia.push({ v, i })
			else if (lang.includes("en"))
				(/natural|neural|premium|enhanced/.test(nama) ? g.natural : g.inggris).push({ v, i })
			else g.lain.push({ v, i })
		})
		return g
	}, [daftarSuara])

	const renderGrup = (label, isi) =>
		isi.length > 0 && (
			<optgroup label={label} key={label}>
				{isi.map(({ v, i }) => (
					<option value={i} key={i}>
						{v.name} ({v.lang})
					</option>
				))}
			</optgroup>
		)

	return (
		<div className="skor-page">
			<div className="floating-particles">
				{partikel.map((p, i) => (
					<div
						key={i}
						className="particle"
						style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
					/>
				))}
			</div>

			{!mulai ? (
				<div className="min-h-screen flex items-center justify-center p-4 relative z-10">
					<div className="glass-card rounded-3xl p-8 shadow-2xl max-w-lg w-full">
						<h1 className="text-3xl font-bold text-center mb-8 glow-effect">
							⚡ Setup Pertandingan
						</h1>
						<div className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-white/90 mb-3" htmlFor="namaA">
									🏆 Nama Team A
								</label>
								<input
									id="namaA"
									type="text"
									value={namaA}
									onChange={(e) => setNamaA(e.target.value)}
									placeholder="Masukkan nama Team A"
									className="glass-input w-full px-4 py-4 rounded-xl"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-white/90 mb-3" htmlFor="namaB">
									🎯 Nama Team B
								</label>
								<input
									id="namaB"
									type="text"
									value={namaB}
									onChange={(e) => setNamaB(e.target.value)}
									placeholder="Masukkan nama Team B"
									className="glass-input w-full px-4 py-4 rounded-xl"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-white/90 mb-3" htmlFor="pilihSuara">
									🎤 Pilih Suara
								</label>
								<select
									id="pilihSuara"
									value={indexSuara}
									onChange={(e) => setIndexSuara(e.target.value)}
									className="voice-selector w-full px-4 py-4">
									{daftarSuara.length === 0 ? (
										<option value="">Suara tidak tersedia di browser ini</option>
									) : (
										<>
											{renderGrup("🇮🇩 Suara Indonesia", grupSuara.indonesia)}
											{renderGrup("🤖 Suara Natural/Premium", grupSuara.natural)}
											{renderGrup("🇺🇸 Suara Inggris", grupSuara.inggris)}
											{renderGrup("🌍 Bahasa Lain", grupSuara.lain)}
										</>
									)}
								</select>
							</div>
							<div className="flex gap-3">
								<button
									onClick={testSuara}
									className="glass-button flex-1 text-white py-4 px-6 rounded-xl font-semibold text-lg">
									🔊 Test Suara
								</button>
								<button
									onClick={mulaiGame}
									className="glass-button flex-1 text-white py-4 px-6 rounded-xl font-semibold text-lg">
									🚀 Mulai
								</button>
							</div>
							<a href="/" className="block text-center text-sm text-white/70 hover:underline">
								&larr; Kembali ke beranda
							</a>
						</div>
					</div>
				</div>
			) : (
				<div className="min-h-screen flex flex-col relative z-10">
					<div className="flex-1 grid grid-cols-1 md:grid-cols-2">
						{[
							{ tim: "A", nama: namaA, skor: skorA, kelas: "team-a" },
							{ tim: "B", nama: namaB, skor: skorB, kelas: "team-b" },
						].map(({ tim, nama, skor, kelas }) => (
							<button
								key={tim}
								type="button"
								onClick={() => tambahSkor(tim)}
								className={`team-section ${kelas} flex flex-col items-center justify-center min-h-[50vh] md:min-h-full`}>
								<h2 className="text-4xl md:text-6xl font-bold mb-8 score-text">{nama}</h2>
								<div
									className={`orbitron text-8xl md:text-[12rem] font-black score-text ${
										animasi[tim] ? "score-animation" : ""
									}`}>
									{skor}
								</div>
								<div className="text-lg md:text-xl opacity-80 mt-4">Tap untuk +1</div>
							</button>
						))}
					</div>

					<div className="control-panel py-6">
						<div className="flex justify-center flex-wrap gap-2 px-4">
							<button
								onClick={() => kurangiSkor("A")}
								className="glass-button text-white px-4 py-3 rounded-xl font-semibold text-sm">
								➖ {namaA}
							</button>
							<button
								onClick={() => kurangiSkor("B")}
								className="glass-button text-white px-4 py-3 rounded-xl font-semibold text-sm">
								➖ {namaB}
							</button>
							<button
								onClick={resetSkor}
								className="glass-button text-white px-6 py-3 rounded-xl font-semibold">
								🔄 Reset
							</button>
							<button
								onClick={gameBaru}
								className="glass-button text-white px-6 py-3 rounded-xl font-semibold">
								🎮 Game Baru
							</button>
							<button
								onClick={() => setSuaraAktif((v) => !v)}
								className={`glass-button text-white px-6 py-3 rounded-xl font-semibold ${
									suaraAktif ? "" : "audio-toggle-off"
								}`}>
								{suaraAktif ? "🔊 Suara ON" : "🔇 Suara OFF"}
							</button>
						</div>
					</div>

					<div className="glass-card fixed bottom-4 right-4 p-3 rounded-lg text-xs text-white/80 max-w-xs hidden md:block z-20">
						<div className="font-semibold mb-2">⌨️ Pintasan Keyboard:</div>
						<div>A = +1 Team A | Q = -1 Team A</div>
						<div>B = +1 Team B | W = -1 Team B</div>
						<div>R = Reset | M = Suara ON/OFF</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default PenghitungSkor
