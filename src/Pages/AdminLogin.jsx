import { useEffect, useState } from "react"
import { db } from "../firebase"
import {
	collection,
	query,
	orderBy,
	getDocs,
	doc,
	updateDoc,
	deleteDoc,
	addDoc,
	serverTimestamp,
} from "firebase/firestore"

// Ganti password admin di sini kapan saja.
const ADMIN_PASSWORD = "PPLG3-Admin-2026"

const AdminLogin = () => {
	const [authed, setAuthed] = useState(() => localStorage.getItem("isAdmin") === "true")
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")
	const [images, setImages] = useState([])
	const [loading, setLoading] = useState(false)
	const [tasks, setTasks] = useState([])
	const [taskSubject, setTaskSubject] = useState("")
	const [taskDescription, setTaskDescription] = useState("")
	const [taskDeadline, setTaskDeadline] = useState("")
	const [announcements, setAnnouncements] = useState([])
	const [announcementText, setAnnouncementText] = useState("")
	const [birthdays, setBirthdays] = useState([])
	const [birthdayName, setBirthdayName] = useState("")
	const [birthdayDate, setBirthdayDate] = useState("")
	const [events, setEvents] = useState([])
	const [eventTitle, setEventTitle] = useState("")
	const [eventDate, setEventDate] = useState("")

	const fetchImages = async () => {
		setLoading(true)
		try {
			const q = query(collection(db, "images"), orderBy("createdAt", "desc"))
			const snapshot = await getDocs(q)
			setImages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	const fetchTasks = async () => {
		try {
			const q = query(collection(db, "assignments"), orderBy("deadline", "asc"))
			const snapshot = await getDocs(q)
			setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
		} catch (err) {
			console.error(err)
		}
	}

	const fetchAnnouncements = async () => {
		try {
			const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"))
			const snapshot = await getDocs(q)
			setAnnouncements(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
		} catch (err) {
			console.error(err)
		}
	}

	const fetchBirthdays = async () => {
		try {
			const q = query(collection(db, "birthdays"), orderBy("date", "asc"))
			const snapshot = await getDocs(q)
			setBirthdays(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
		} catch (err) {
			console.error(err)
		}
	}

	const fetchEvents = async () => {
		try {
			const q = query(collection(db, "events"), orderBy("date", "asc"))
			const snapshot = await getDocs(q)
			setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
		} catch (err) {
			console.error(err)
		}
	}

	useEffect(() => {
		if (authed) {
			fetchImages()
			fetchTasks()
			fetchAnnouncements()
			fetchBirthdays()
			fetchEvents()
		}
	}, [authed])

	const addAnnouncement = async (e) => {
		e.preventDefault()
		if (!announcementText.trim()) return
		await addDoc(collection(db, "announcements"), {
			text: announcementText.trim(),
			createdAt: serverTimestamp(),
		})
		setAnnouncementText("")
		fetchAnnouncements()
	}

	const deleteAnnouncement = async (id) => {
		await deleteDoc(doc(db, "announcements", id))
		fetchAnnouncements()
	}

	const addBirthday = async (e) => {
		e.preventDefault()
		if (!birthdayName.trim() || !birthdayDate) return
		await addDoc(collection(db, "birthdays"), {
			name: birthdayName.trim(),
			date: birthdayDate,
		})
		setBirthdayName("")
		setBirthdayDate("")
		fetchBirthdays()
	}

	const deleteBirthday = async (id) => {
		await deleteDoc(doc(db, "birthdays", id))
		fetchBirthdays()
	}

	const addEvent = async (e) => {
		e.preventDefault()
		if (!eventTitle.trim() || !eventDate) return
		await addDoc(collection(db, "events"), {
			title: eventTitle.trim(),
			date: eventDate,
		})
		setEventTitle("")
		setEventDate("")
		fetchEvents()
	}

	const deleteEvent = async (id) => {
		await deleteDoc(doc(db, "events", id))
		fetchEvents()
	}

	const addTask = async (e) => {
		e.preventDefault()
		if (!taskSubject.trim() || !taskDeadline) return
		await addDoc(collection(db, "assignments"), {
			subject: taskSubject.trim(),
			description: taskDescription.trim(),
			deadline: taskDeadline,
			createdAt: serverTimestamp(),
		})
		setTaskSubject("")
		setTaskDescription("")
		setTaskDeadline("")
		fetchTasks()
	}

	const deleteTask = async (id) => {
		await deleteDoc(doc(db, "assignments", id))
		fetchTasks()
	}

	const handleLogin = (e) => {
		e.preventDefault()
		if (password === ADMIN_PASSWORD) {
			localStorage.setItem("isAdmin", "true")
			setAuthed(true)
			setError("")
		} else {
			setError("Password salah")
		}
	}

	const handleLogout = () => {
		localStorage.removeItem("isAdmin")
		setAuthed(false)
		setPassword("")
	}

	const approveImage = async (id) => {
		await updateDoc(doc(db, "images", id), { status: "approved" })
		fetchImages()
	}

	const rejectImage = async (id) => {
		await deleteDoc(doc(db, "images", id))
		fetchImages()
	}

	if (!authed) {
		return (
			<div className="min-h-screen flex items-center justify-center text-white px-8">
				<form onSubmit={handleLogin} className="w-full max-w-xs">
					<h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Password"
						className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 outline-none mb-3"
					/>
					{error && <p className="text-red-400 text-sm mb-3">{error}</p>}
					<button
						type="submit"
						className="w-full py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200">
						Login
					</button>
				</form>
			</div>
		)
	}

	const pending = images.filter((img) => img.status !== "approved")
	const approved = images.filter((img) => img.status === "approved")

	const renderCard = (img) => (
		<div key={img.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
			<img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg" />
			<div className="flex-1 min-w-0">
				<p className="text-xs opacity-60 truncate">{img.url}</p>
				<p className="text-xs opacity-40">
					{img.createdAt?.toDate ? img.createdAt.toDate().toLocaleString() : ""}
				</p>
			</div>
			<div className="flex gap-2 shrink-0">
				{img.status !== "approved" && (
					<button
						onClick={() => approveImage(img.id)}
						className="px-3 py-1 text-sm rounded-lg bg-green-600 hover:bg-green-700">
						Approve
					</button>
				)}
				<button
					onClick={() => rejectImage(img.id)}
					className="px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700">
					Hapus
				</button>
			</div>
		</div>
	)

	return (
		<div className="min-h-screen text-white px-6 py-10 max-w-3xl mx-auto">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-2xl font-bold">Panel Admin</h1>
				<button onClick={handleLogout} className="text-sm opacity-60 hover:underline">
					Logout
				</button>
			</div>

			{loading ? (
				<p className="opacity-60">Memuat...</p>
			) : (
				<>
					<h2 className="text-lg font-semibold mb-3">Menunggu Persetujuan ({pending.length})</h2>
					<div className="flex flex-col gap-3 mb-10">
						{pending.length === 0 && <p className="opacity-50 text-sm">Tidak ada.</p>}
						{pending.map(renderCard)}
					</div>

					<h2 className="text-lg font-semibold mb-3">Sudah Disetujui ({approved.length})</h2>
					<div className="flex flex-col gap-3 mb-10">
						{approved.length === 0 && <p className="opacity-50 text-sm">Tidak ada.</p>}
						{approved.map(renderCard)}
					</div>

					<h2 className="text-lg font-semibold mb-3">Tugas & PR</h2>
					<form
						onSubmit={addTask}
						className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 mb-4">
						<input
							type="text"
							value={taskSubject}
							onChange={(e) => setTaskSubject(e.target.value)}
							placeholder="Mata pelajaran"
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm"
						/>
						<textarea
							value={taskDescription}
							onChange={(e) => setTaskDescription(e.target.value)}
							placeholder="Deskripsi tugas"
							rows={2}
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm resize-none"
						/>
						<input
							type="date"
							value={taskDeadline}
							onChange={(e) => setTaskDeadline(e.target.value)}
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm"
						/>
						<button
							type="submit"
							className="py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200">
							Tambah Tugas
						</button>
					</form>
					<div className="flex flex-col gap-3 mb-10">
						{tasks.length === 0 && <p className="opacity-50 text-sm">Belum ada tugas.</p>}
						{tasks.map((task) => (
							<div
								key={task.id}
								className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
								<div className="flex-1 min-w-0">
									<p className="font-semibold">{task.subject}</p>
									<p className="text-sm opacity-70">{task.description}</p>
									<p className="text-xs opacity-40">Deadline: {task.deadline}</p>
								</div>
								<button
									onClick={() => deleteTask(task.id)}
									className="px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 shrink-0">
									Hapus
								</button>
							</div>
						))}
					</div>

					<h2 className="text-lg font-semibold mb-3">Pengumuman</h2>
					<form
						onSubmit={addAnnouncement}
						className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 mb-4">
						<textarea
							value={announcementText}
							onChange={(e) => setAnnouncementText(e.target.value)}
							placeholder="Isi pengumuman (misal: Besok ulangan Matematika)"
							rows={2}
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm resize-none"
						/>
						<button
							type="submit"
							className="py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200">
							Tambah Pengumuman
						</button>
					</form>
					<div className="flex flex-col gap-3 mb-10">
						{announcements.length === 0 && (
							<p className="opacity-50 text-sm">Belum ada pengumuman.</p>
						)}
						{announcements.map((item) => (
							<div
								key={item.id}
								className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
								<p className="flex-1 min-w-0 text-sm break-words">{item.text}</p>
								<button
									onClick={() => deleteAnnouncement(item.id)}
									className="px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 shrink-0">
									Hapus
								</button>
							</div>
						))}
					</div>

					<h2 className="text-lg font-semibold mb-3">Ulang Tahun</h2>
					<form
						onSubmit={addBirthday}
						className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 mb-4">
						<input
							type="text"
							value={birthdayName}
							onChange={(e) => setBirthdayName(e.target.value)}
							placeholder="Nama siswa"
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm"
						/>
						<input
							type="date"
							value={birthdayDate}
							onChange={(e) => setBirthdayDate(e.target.value)}
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm"
						/>
						<button
							type="submit"
							className="py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200">
							Tambah Ulang Tahun
						</button>
					</form>
					<div className="flex flex-col gap-3 mb-10">
						{birthdays.length === 0 && (
							<p className="opacity-50 text-sm">Belum ada data ulang tahun.</p>
						)}
						{birthdays.map((b) => (
							<div
								key={b.id}
								className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
								<div className="flex-1 min-w-0">
									<p className="font-semibold">{b.name}</p>
									<p className="text-xs opacity-40">{b.date}</p>
								</div>
								<button
									onClick={() => deleteBirthday(b.id)}
									className="px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 shrink-0">
									Hapus
								</button>
							</div>
						))}
					</div>

					<h2 className="text-lg font-semibold mb-3">Acara / Countdown</h2>
					<form
						onSubmit={addEvent}
						className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 mb-4">
						<input
							type="text"
							value={eventTitle}
							onChange={(e) => setEventTitle(e.target.value)}
							placeholder="Nama acara (misal: Ujian Akhir Semester)"
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm"
						/>
						<input
							type="date"
							value={eventDate}
							onChange={(e) => setEventDate(e.target.value)}
							className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm"
						/>
						<button
							type="submit"
							className="py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200">
							Tambah Acara
						</button>
					</form>
					<div className="flex flex-col gap-3">
						{events.length === 0 && <p className="opacity-50 text-sm">Belum ada acara.</p>}
						{events.map((ev) => (
							<div
								key={ev.id}
								className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 items-center">
								<div className="flex-1 min-w-0">
									<p className="font-semibold">{ev.title}</p>
									<p className="text-xs opacity-40">{ev.date}</p>
								</div>
								<button
									onClick={() => deleteEvent(ev.id)}
									className="px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 shrink-0">
									Hapus
								</button>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	)
}

export default AdminLogin
