import { useEffect, useState } from "react"
import { db } from "../firebase"
import { collection, query, orderBy, getDocs } from "firebase/firestore"

const AUTO_HIDE_MS = 10000

const NotifPopup = () => {
	const [items, setItems] = useState([])
	const [closing, setClosing] = useState(false)
	const [hidden, setHidden] = useState(false)
	const [now, setNow] = useState(() => Date.now())

	useEffect(() => {
		const loadNotifications = async () => {
			const notifs = []

			try {
				const annSnap = await getDocs(
					query(collection(db, "announcements"), orderBy("createdAt", "desc")),
				)
				annSnap.docs.forEach((d) =>
					notifs.push({
						id: `pengumuman-${d.id}`,
						icon: "📢",
						title: "Pengumuman",
						text: d.data().text,
					}),
				)
			} catch (err) {
				console.error("Gagal mengambil pengumuman:", err)
			}

			try {
				const bdaySnap = await getDocs(collection(db, "birthdays"))
				const today = new Date()
				const todayKey = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(
					today.getDate(),
				).padStart(2, "0")}`
				const celebrants = bdaySnap.docs
					.map((d) => d.data())
					.filter((b) => b.date?.slice(5) === todayKey)

				if (celebrants.length > 0) {
					notifs.push({
						id: "ulangtahun",
						icon: "🎂",
						title: "Ulang Tahun Hari Ini",
						text: `Selamat ulang tahun ${celebrants.map((c) => c.name).join(", ")}!`,
					})
				}
			} catch (err) {
				console.error("Gagal mengambil data ulang tahun:", err)
			}

			try {
				const evSnap = await getDocs(query(collection(db, "events"), orderBy("date", "asc")))
				const upcoming = evSnap.docs
					.map((d) => d.data())
					.find((e) => e.date && new Date(`${e.date}T23:59:59`).getTime() >= Date.now())

				if (upcoming) {
					notifs.push({
						id: "acara",
						icon: "⏳",
						title: upcoming.title,
						countdownTo: new Date(`${upcoming.date}T00:00:00`).getTime(),
					})
				}
			} catch (err) {
				console.error("Gagal mengambil acara:", err)
			}

			setItems(notifs)
		}

		loadNotifications()
	}, [])

	// Sembunyikan otomatis setelah 10 detik.
	useEffect(() => {
		if (items.length === 0) return
		const fadeTimer = setTimeout(() => setClosing(true), AUTO_HIDE_MS)
		const removeTimer = setTimeout(() => setHidden(true), AUTO_HIDE_MS + 400)
		return () => {
			clearTimeout(fadeTimer)
			clearTimeout(removeTimer)
		}
	}, [items])

	// Ticker cuma jalan selama popup masih tampil.
	useEffect(() => {
		if (hidden || items.length === 0) return
		const timer = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(timer)
	}, [hidden, items])

	const closeNow = () => {
		setClosing(true)
		setTimeout(() => setHidden(true), 400)
	}

	if (hidden || items.length === 0) return null

	const formatCountdown = (target) => {
		const diff = target - now
		if (diff <= 0) return "Berlangsung hari ini!"

		const days = Math.floor(diff / 86400000)
		const hours = Math.floor((diff % 86400000) / 3600000)
		const minutes = Math.floor((diff % 3600000) / 60000)
		const seconds = Math.floor((diff % 60000) / 1000)
		return `${days} hari ${hours} jam ${minutes} menit ${seconds} detik lagi`
	}

	return (
		<div
			className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-md flex flex-col gap-2 ${
				closing ? "NotifPopup-out" : "NotifPopup-in"
			}`}>
			{items.map((item) => (
				<div key={item.id} className="InfoCard flex items-start gap-3">
					<span className="text-xl leading-none">{item.icon}</span>
					<div className="min-w-0 flex-1">
						<p className="text-white text-sm font-semibold break-words">{item.title}</p>
						<p className="text-white opacity-70 text-sm mt-1 break-words">
							{item.countdownTo ? formatCountdown(item.countdownTo) : item.text}
						</p>
					</div>
					<button
						onClick={closeNow}
						aria-label="Tutup notifikasi"
						className="text-white opacity-50 hover:opacity-100 text-lg leading-none shrink-0">
						&times;
					</button>
				</div>
			))}
		</div>
	)
}

export default NotifPopup
