import { useEffect, useState } from "react"
import { db } from "../firebase"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { bersihkanKedaluwarsa, sudahKedaluwarsa } from "../utils/kedaluwarsa"
import Footer from "./Footer"
import TombolNotif from "../components/TombolNotif"

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

	// Hapus otomatis data kedaluwarsa saat halaman dibuka. Aturan tanggalnya
	// terpusat di src/utils/kedaluwarsa.js.
	useEffect(() => {
		bersihkanKedaluwarsa()
	}, [])

	useEffect(() => {
		const q = query(collection(db, "assignments"), orderBy("deadline", "asc"))
		const unsubscribe = onSnapshot(q, (snapshot) => {
			const list = snapshot.docs
				.map((d) => ({ id: d.id, ...d.data() }))
				.filter((t) => !sudahKedaluwarsa("assignments", t))
			setTasks(list)
		})

		return () => unsubscribe()
	}, [])

	return (
		<div className="text-white min-h-screen flex flex-col">
			<div className="px-[10%] py-16 lg:py-20 max-w-2xl mx-auto flex-1 w-full">
				<h1 className="text-3xl md:text-4xl font-bold text-center mb-6 Glow">
					Tugas & PR
				</h1>

				<div className="flex justify-center mb-10">
					<TombolNotif />
				</div>

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
