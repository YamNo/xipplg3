import { useEffect, useState } from "react"
import AOS from "aos"
import "aos/dist/aos.css"
import { db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"
import { DEFAULT_JADWAL, HARI, LABEL_HARI } from "../data/defaults"

const Schedule = () => {
	const daysOfWeek = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	]
	const dayIndex = new Date().getDay()
	const currentDay = daysOfWeek[dayIndex]
	// index 1..5 = Senin..Jumat; 0 (Minggu) & 6 (Sabtu) tidak ada jadwal
	const hariKey = HARI[dayIndex - 1]

	const [items, setItems] = useState(hariKey ? DEFAULT_JADWAL[hariKey] : [])
	const [loading, setLoading] = useState(!!hariKey)

	useEffect(() => {
		AOS.init()
		AOS.refresh()
	}, [])

	useEffect(() => {
		if (!hariKey) return

		const ambilJadwal = async () => {
			try {
				const snap = await getDoc(doc(db, "schedule", hariKey))
				if (snap.exists() && Array.isArray(snap.data().items)) {
					setItems(snap.data().items)
				}
			} catch (err) {
				// Kalau gagal, tetap pakai jadwal bawaan yang sudah di-set awal.
				console.error("Gagal mengambil jadwal:", err)
			} finally {
				setLoading(false)
			}
		}

		ambilJadwal()
	}, [hariKey])

	useEffect(() => {
		AOS.refresh()
	}, [items])

	return (
		<>
			<div className="lg:flex lg:justify-center lg:gap-32 lg:mb-10 lg:mt-16 ">
				<div className="text-white flex flex-col justify-center items-center mt-8 md:mt-3 overflow-y-hidden">
					<div className="text-2xl font-medium mb-5" data-aos="fade-up" data-aos-duration="500">
						{hariKey ? LABEL_HARI[hariKey] : currentDay}
					</div>

					<div data-aos="fade-up" data-aos-duration="400">
						{!hariKey ? (
							<p className="opacity-50">Tidak Ada Jadwal Hari Ini</p>
						) : loading ? (
							<div className="flex flex-col gap-2 w-72">
								{[0, 1, 2, 3, 4].map((i) => (
									<div key={i} className="Skeleton h-10"></div>
								))}
							</div>
						) : items.length === 0 ? (
							<p className="opacity-50">Tidak Ada Jadwal Hari Ini</p>
						) : (
							items.map((item, idx) => (
								<div
									key={idx}
									className={
										item.isBreak
											? "flex justify-between py-[0.50rem] w-72 px-3 opacity-60"
											: "border-t-2 border-b-2 border-white flex justify-between py-[0.50rem] w-72 px-3"
									}>
									<div className="w-[50%] text-base font-medium">{item.subject}</div>
									<div className="flex justify-center items-center text-sm">{item.time}</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</>
	)
}

export default Schedule
