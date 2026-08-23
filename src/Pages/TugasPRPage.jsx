import { useEffect, useRef, useState } from "react"
import { db } from "../firebase"
import { collection, query, orderBy, onSnapshot, getDocs, deleteDoc, doc } from "firebase/firestore"
import Footer from "./Footer"

const formatDeadline = (deadline) => {
	if (!deadline) return ""
	return new Date(deadline).toLocaleDateString("id-ID", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	})
}

const TugasPRPage = () => {
	const [tasks, setTasks] = useState([])
	const [notifStatus, setNotifStatus] = useState(
		typeof Notification !== "undefined" ? Notification.permission : "unsupported",
	)
	const knownIds = useRef(null)

	// Hapus otomatis tugas yang deadline-nya sudah lewat, dijalankan sekali saat
	// halaman dibuka. Tugas masih tampil sepanjang hari deadline-nya, lalu hilang
	// begitu tanggalnya terlewati (deadline 2026-08-30 hilang pada 2026-08-31).
	useEffect(() => {
		const bersihkanKedaluwarsa = async () => {
			try {
				const hariIni = new Date().toLocaleDateString("sv-SE")

				const snap = await getDocs(collection(db, "assignments"))
				const kedaluwarsa = snap.docs.filter((d) => {
					const deadline = d.data().deadline
					return deadline && deadline < hariIni
				})

				await Promise.all(kedaluwarsa.map((d) => deleteDoc(doc(db, "assignments", d.id))))
				if (kedaluwarsa.length > 0) {
					console.log(`${kedaluwarsa.length} tugas kedaluwarsa dihapus otomatis.`)
				}
			} catch (err) {
				console.error("Gagal menghapus tugas kedaluwarsa:", err)
			}
		}

		bersihkanKedaluwarsa()
	}, [])

	useEffect(() => {
		const q = query(collection(db, "assignments"), orderBy("deadline", "asc"))
		const unsubscribe = onSnapshot(q, (snapshot) => {
			const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
			setTasks(list)

			// Baru kirim notifikasi untuk tugas yang ditambahkan SETELAH halaman ini dibuka,
			// bukan untuk semua tugas yang sudah ada saat pertama kali load.
			if (knownIds.current === null) {
				knownIds.current = new Set(list.map((t) => t.id))
				return
			}
			const newTasks = list.filter((t) => !knownIds.current.has(t.id))
			knownIds.current = new Set(list.map((t) => t.id))

			if (Notification.permission === "granted") {
				newTasks.forEach((t) => {
					new Notification("Tugas Baru: " + t.subject, {
						body: t.description || "Ada tugas baru, cek deadline-nya!",
					})
				})
			}
		})

		return () => unsubscribe()
	}, [])

	const enableNotifications = async () => {
		if (typeof Notification === "undefined") return
		const result = await Notification.requestPermission()
		setNotifStatus(result)
	}

	return (
		<div className="text-white min-h-screen flex flex-col">
			<div className="px-[10%] py-16 lg:py-20 max-w-2xl mx-auto flex-1 w-full">
				<h1 className="text-3xl md:text-4xl font-bold text-center mb-6 Glow">
					Tugas & PR
				</h1>

				<div className="flex justify-center mb-10">
					{notifStatus === "granted" ? (
						<p className="text-sm opacity-60">🔔 Notifikasi aktif</p>
					) : notifStatus === "denied" ? (
						<p className="text-sm opacity-60">
							Notifikasi diblokir. Aktifkan lewat pengaturan izin browser untuk situs ini.
						</p>
					) : notifStatus === "unsupported" ? null : (
						<button
							onClick={enableNotifications}
							className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200">
							Aktifkan Notifikasi
						</button>
					)}
				</div>

				<p className="text-xs opacity-40 text-center mb-8 max-w-sm mx-auto">
					Notifikasi muncul otomatis kalau ada tugas baru, selama tab/browser situs ini masih
					terbuka (tidak muncul kalau browser ditutup total).
				</p>

				<div className="flex flex-col gap-3">
					{tasks.length === 0 && (
						<p className="opacity-50 text-sm text-center">Belum ada tugas.</p>
					)}
					{tasks.map((task) => {
						const isOverdue =
							task.deadline && new Date(task.deadline) < new Date().setHours(0, 0, 0, 0)
						return (
							<div key={task.id} className="ActionBox text-left">
								<div className="flex justify-between items-start">
									<h3 className="text-white text-lg font-semibold">{task.subject}</h3>
									{isOverdue && (
										<span className="text-[0.65rem] bg-red-500/80 text-white px-2 py-0.5 rounded-full shrink-0">
											Lewat deadline
										</span>
									)}
								</div>
								<p className="text-white opacity-70 text-sm mt-1">{task.description}</p>
								<p className="text-white opacity-50 text-xs mt-2">
									Deadline: {formatDeadline(task.deadline)}
								</p>
							</div>
						)
					})}
				</div>

				<div className="text-center mt-12">
					<a href="/" className="text-sm opacity-70 hover:underline">
						&larr; Kembali ke beranda
					</a>
				</div>
			</div>

			<Footer />
		</div>
	)
}

export default TugasPRPage
