import { useEffect, useState } from "react"
import { db } from "../firebase"
import {
	collection,
	query,
	orderBy,
	getDocs,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	deleteDoc,
	addDoc,
	serverTimestamp,
} from "firebase/firestore"
import { useAdminAuth } from "../hooks/useAdminAuth"
import { HARI, LABEL_HARI, DEFAULT_JADWAL, DEFAULT_STRUKTUR } from "../data/defaults"

const inputClass =
	"px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm w-full"
const primaryBtn =
	"py-2 px-4 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200 disabled:opacity-50"
const dangerBtn = "px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 shrink-0"
const cardClass = "bg-white/5 border border-white/10 rounded-xl p-3"

const AdminLogin = () => {
	const { user, isAdmin, checking, error: authError, login, logout } = useAdminAuth()

	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [loggingIn, setLoggingIn] = useState(false)

	const [images, setImages] = useState([])
	const [tasks, setTasks] = useState([])
	const [announcements, setAnnouncements] = useState([])
	const [birthdays, setBirthdays] = useState([])
	const [events, setEvents] = useState([])
	const [chats, setChats] = useState([])
	const [blockedIps, setBlockedIps] = useState([])
	const [struktur, setStruktur] = useState(DEFAULT_STRUKTUR)
	const [jadwal, setJadwal] = useState(DEFAULT_JADWAL)
	const [hariAktif, setHariAktif] = useState("senin")
	const [loading, setLoading] = useState(false)
	const [notice, setNotice] = useState("")

	const [taskSubject, setTaskSubject] = useState("")
	const [taskDescription, setTaskDescription] = useState("")
	const [taskDeadline, setTaskDeadline] = useState("")
	const [announcementText, setAnnouncementText] = useState("")
	const [announcementExpiry, setAnnouncementExpiry] = useState("")
	const [birthdayName, setBirthdayName] = useState("")
	const [birthdayDate, setBirthdayDate] = useState("")
	const [eventTitle, setEventTitle] = useState("")
	const [eventDate, setEventDate] = useState("")
	const [eventExpiry, setEventExpiry] = useState("")
	const [newIp, setNewIp] = useState("")

	const fetchAll = async () => {
		setLoading(true)
		const ambil = async (nama, urutan) => {
			try {
				const q = urutan
					? query(collection(db, nama), orderBy(urutan.field, urutan.dir))
					: collection(db, nama)
				const snap = await getDocs(q)
				return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
			} catch (err) {
				console.error(`Gagal mengambil ${nama}:`, err)
				return []
			}
		}

		const [img, tsk, ann, bd, ev, ch, ips] = await Promise.all([
			ambil("images", { field: "createdAt", dir: "desc" }),
			ambil("assignments", { field: "deadline", dir: "asc" }),
			ambil("announcements", { field: "createdAt", dir: "desc" }),
			ambil("birthdays", { field: "date", dir: "asc" }),
			ambil("events", { field: "date", dir: "asc" }),
			ambil("chats", { field: "timestamp", dir: "desc" }),
			ambil("blacklist_ips"),
		])

		setImages(img)
		setTasks(tsk)
		setAnnouncements(ann)
		setBirthdays(bd)
		setEvents(ev)
		setChats(ch)
		setBlockedIps(ips)

		try {
			const s = await getDoc(doc(db, "settings", "struktur"))
			if (s.exists()) setStruktur({ ...DEFAULT_STRUKTUR, ...s.data() })
		} catch (err) {
			console.error("Gagal mengambil struktur:", err)
		}

		try {
			const snap = await getDocs(collection(db, "schedule"))
			if (!snap.empty) {
				const dariDb = { ...DEFAULT_JADWAL }
				snap.docs.forEach((d) => {
					if (Array.isArray(d.data().items)) dariDb[d.id] = d.data().items
				})
				setJadwal(dariDb)
			}
		} catch (err) {
			console.error("Gagal mengambil jadwal:", err)
		}

		setLoading(false)
	}

	useEffect(() => {
		if (isAdmin) fetchAll()
	}, [isAdmin])

	const flash = (msg) => {
		setNotice(msg)
		setTimeout(() => setNotice(""), 3000)
	}

	const handleLogin = async (e) => {
		e.preventDefault()
		setLoggingIn(true)
		await login(email, password)
		setLoggingIn(false)
	}

	// --- Foto ---
	const approveImage = async (id) => {
		await updateDoc(doc(db, "images", id), { status: "approved" })
		fetchAll()
	}
	const deleteImage = async (id) => {
		await deleteDoc(doc(db, "images", id))
		fetchAll()
	}

	// --- Tugas ---
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
		fetchAll()
	}
	const deleteTask = async (id) => {
		await deleteDoc(doc(db, "assignments", id))
		fetchAll()
	}

	// --- Pengumuman ---
	const addAnnouncement = async (e) => {
		e.preventDefault()
		if (!announcementText.trim()) return
		await addDoc(collection(db, "announcements"), {
			text: announcementText.trim(),
			createdAt: serverTimestamp(),
			...(announcementExpiry ? { expiresAt: announcementExpiry } : {}),
		})
		setAnnouncementText("")
		setAnnouncementExpiry("")
		fetchAll()
	}
	const deleteAnnouncement = async (id) => {
		await deleteDoc(doc(db, "announcements", id))
		fetchAll()
	}

	// --- Ulang tahun ---
	const addBirthday = async (e) => {
		e.preventDefault()
		if (!birthdayName.trim() || !birthdayDate) return
		await addDoc(collection(db, "birthdays"), {
			name: birthdayName.trim(),
			date: birthdayDate,
		})
		setBirthdayName("")
		setBirthdayDate("")
		fetchAll()
	}
	const deleteBirthday = async (id) => {
		await deleteDoc(doc(db, "birthdays", id))
		fetchAll()
	}

	// --- Acara ---
	const addEvent = async (e) => {
		e.preventDefault()
		if (!eventTitle.trim() || !eventDate) return
		await addDoc(collection(db, "events"), {
			title: eventTitle.trim(),
			date: eventDate,
			...(eventExpiry ? { expiresAt: eventExpiry } : {}),
		})
		setEventTitle("")
		setEventDate("")
		setEventExpiry("")
		fetchAll()
	}
	const deleteEvent = async (id) => {
		await deleteDoc(doc(db, "events", id))
		fetchAll()
	}

	// --- Chat ---
	const deleteChat = async (id) => {
		await deleteDoc(doc(db, "chats", id))
		fetchAll()
	}
	const blockIp = async (ip) => {
		if (!ip) return
		if (blockedIps.some((b) => b.ipAddress === ip)) {
			flash(`IP ${ip} sudah diblokir.`)
			return
		}
		await addDoc(collection(db, "blacklist_ips"), { ipAddress: ip })
		flash(`IP ${ip} diblokir.`)
		fetchAll()
	}
	const unblockIp = async (id) => {
		await deleteDoc(doc(db, "blacklist_ips", id))
		fetchAll()
	}
	const addIpManual = async (e) => {
		e.preventDefault()
		if (!newIp.trim()) return
		await blockIp(newIp.trim())
		setNewIp("")
	}

	// --- Struktur ---
	const simpanStruktur = async (e) => {
		e.preventDefault()
		await setDoc(doc(db, "settings", "struktur"), struktur)
		flash("Struktur kelas disimpan.")
	}

	// --- Jadwal ---
	const ubahItem = (hari, idx, field, value) => {
		setJadwal((prev) => {
			const items = [...(prev[hari] || [])]
			items[idx] = { ...items[idx], [field]: value }
			return { ...prev, [hari]: items }
		})
	}
	const tambahItem = (hari) => {
		setJadwal((prev) => ({
			...prev,
			[hari]: [...(prev[hari] || []), { subject: "", time: "", isBreak: false }],
		}))
	}
	const hapusItem = (hari, idx) => {
		setJadwal((prev) => ({ ...prev, [hari]: prev[hari].filter((_, i) => i !== idx) }))
	}
	const simpanJadwal = async (hari) => {
		const items = (jadwal[hari] || []).filter((it) => it.subject.trim() && it.time.trim())
		await setDoc(doc(db, "schedule", hari), { items })
		flash(`Jadwal ${LABEL_HARI[hari]} disimpan (${items.length} item).`)
		fetchAll()
	}
	const resetJadwalBawaan = (hari) => {
		setJadwal((prev) => ({ ...prev, [hari]: DEFAULT_JADWAL[hari] || [] }))
		flash(`Jadwal ${LABEL_HARI[hari]} diisi dari bawaan — klik Simpan untuk menerapkan.`)
	}

	// ---------- Tampilan ----------

	if (checking) {
		return (
			<div className="min-h-screen flex items-center justify-center text-white">
				<p className="opacity-60">Memeriksa sesi...</p>
			</div>
		)
	}

	if (!user || !isAdmin) {
		return (
			<div className="min-h-screen flex items-center justify-center text-white px-8">
				<form onSubmit={handleLogin} className="w-full max-w-sm">
					<h1 className="text-2xl font-bold mb-2 text-center">Admin Login</h1>
					<p className="text-xs opacity-50 text-center mb-6">
						Masuk dengan email &amp; password admin.
					</p>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Email admin"
						autoComplete="username"
						className={`${inputClass} mb-3`}
					/>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Password"
						autoComplete="current-password"
						className={`${inputClass} mb-3`}
					/>
					{authError && <p className="text-red-400 text-sm mb-3 break-words">{authError}</p>}
					<button type="submit" disabled={loggingIn} className={`${primaryBtn} w-full`}>
						{loggingIn ? "Memproses..." : "Login"}
					</button>
				</form>
			</div>
		)
	}

	const pending = images.filter((img) => img.status !== "approved")
	const approved = images.filter((img) => img.status === "approved")
	const hariIni = new Date().toLocaleDateString("sv-SE")
	const chatHariIni = chats.filter(
		(c) => c.timestamp?.toDate && c.timestamp.toDate().toLocaleDateString("sv-SE") === hariIni,
	).length
	const tugasAktif = tasks.filter((t) => (t.deadline || "") >= hariIni).length

	const renderImageCard = (img) => (
		<div key={img.id} className={`${cardClass} flex gap-3 items-center`}>
			<img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
			<div className="flex-1 min-w-0">
				<p className="text-xs opacity-60 truncate">{img.url}</p>
				<p className="text-xs opacity-40">
					{img.createdAt?.toDate ? img.createdAt.toDate().toLocaleString("id-ID") : ""}
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
				<button onClick={() => deleteImage(img.id)} className={dangerBtn}>
					Hapus
				</button>
			</div>
		</div>
	)

	return (
		<div className="min-h-screen text-white px-6 py-10 max-w-3xl mx-auto">
			<div className="flex justify-between items-start mb-2 gap-4">
				<h1 className="text-2xl font-bold">Panel Admin</h1>
				<div className="text-right shrink-0">
					<p className="text-xs opacity-50 break-all">{user.email}</p>
					<button onClick={logout} className="text-sm opacity-60 hover:underline">
						Logout
					</button>
				</div>
			</div>

			{notice && (
				<div className="bg-green-600/20 border border-green-500/40 rounded-lg px-3 py-2 text-sm mb-4">
					{notice}
				</div>
			)}

			{/* Statistik */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 mt-4">
				{[
					["Foto pending", pending.length],
					["Pesan hari ini", chatHariIni],
					["Tugas aktif", tugasAktif],
					["IP diblokir", blockedIps.length],
				].map(([label, angka]) => (
					<div key={label} className={`${cardClass} text-center`}>
						<p className="text-2xl font-bold">{angka}</p>
						<p className="text-xs opacity-50 mt-1">{label}</p>
					</div>
				))}
			</div>

			{loading ? (
				<p className="opacity-60">Memuat data...</p>
			) : (
				<>
					{/* Foto */}
					<h2 className="text-lg font-semibold mb-3">Foto Menunggu Persetujuan ({pending.length})</h2>
					<div className="flex flex-col gap-3 mb-8">
						{pending.length === 0 && <p className="opacity-50 text-sm">Tidak ada.</p>}
						{pending.map(renderImageCard)}
					</div>

					<h2 className="text-lg font-semibold mb-3">Foto Disetujui ({approved.length})</h2>
					<div className="flex flex-col gap-3 mb-10">
						{approved.length === 0 && <p className="opacity-50 text-sm">Tidak ada.</p>}
						{approved.map(renderImageCard)}
					</div>

					{/* Moderasi chat */}
					<h2 className="text-lg font-semibold mb-3">Text Anonim ({chats.length} pesan)</h2>
					<div className="flex flex-col gap-3 mb-4">
						{chats.length === 0 && <p className="opacity-50 text-sm">Belum ada pesan.</p>}
						{chats.map((c) => (
							<div key={c.id} className={`${cardClass} flex gap-3 items-center`}>
								<div className="flex-1 min-w-0">
									<p className="text-sm break-words">{c.message}</p>
									<p className="text-xs opacity-40 mt-1">
										{c.userIp || "IP tidak diketahui"}
										{c.timestamp?.toDate
											? ` · ${c.timestamp.toDate().toLocaleString("id-ID")}`
											: ""}
									</p>
								</div>
								<div className="flex gap-2 shrink-0">
									{c.userIp && (
										<button
											onClick={() => blockIp(c.userIp)}
											className="px-3 py-1 text-sm rounded-lg bg-orange-600 hover:bg-orange-700">
											Blokir IP
										</button>
									)}
									<button onClick={() => deleteChat(c.id)} className={dangerBtn}>
										Hapus
									</button>
								</div>
							</div>
						))}
					</div>

					<h3 className="text-sm font-semibold opacity-70 mb-2">IP Diblokir</h3>
					<form onSubmit={addIpManual} className="flex gap-2 mb-3">
						<input
							type="text"
							value={newIp}
							onChange={(e) => setNewIp(e.target.value)}
							placeholder="Blokir IP manual (mis. 125.165.189.0/24)"
							className={inputClass}
						/>
						<button type="submit" className={primaryBtn}>
							Blokir
						</button>
					</form>
					<div className="flex flex-col gap-2 mb-10">
						{blockedIps.length === 0 && (
							<p className="opacity-50 text-sm">Belum ada IP diblokir.</p>
						)}
						{blockedIps.map((b) => (
							<div key={b.id} className={`${cardClass} flex gap-3 items-center`}>
								<p className="flex-1 min-w-0 text-sm break-all">{b.ipAddress}</p>
								<button onClick={() => unblockIp(b.id)} className={dangerBtn}>
									Buka Blokir
								</button>
							</div>
						))}
					</div>

					{/* Struktur kelas */}
					<h2 className="text-lg font-semibold mb-3">Struktur Kelas</h2>
					<form onSubmit={simpanStruktur} className={`${cardClass} flex flex-col gap-2 mb-10`}>
						{[
							["waliKelas", "Wali Kelas"],
							["ketua", "Ketua Kelas"],
							["wakil", "Wakil Ketua"],
						].map(([field, label]) => (
							<label key={field} className="text-sm">
								<span className="opacity-60 text-xs">{label}</span>
								<input
									type="text"
									value={struktur[field] || ""}
									onChange={(e) => setStruktur({ ...struktur, [field]: e.target.value })}
									className={`${inputClass} mt-1`}
								/>
							</label>
						))}
						<label className="text-sm">
							<span className="opacity-60 text-xs">Sekretaris (pisahkan dengan koma)</span>
							<input
								type="text"
								value={(struktur.sekretaris || []).join(", ")}
								onChange={(e) =>
									setStruktur({
										...struktur,
										sekretaris: e.target.value
											.split(",")
											.map((s) => s.trim())
											.filter(Boolean),
									})
								}
								className={`${inputClass} mt-1`}
							/>
						</label>
						<button type="submit" className={`${primaryBtn} mt-1`}>
							Simpan Struktur
						</button>
					</form>

					{/* Jadwal */}
					<h2 className="text-lg font-semibold mb-3">Jadwal Pelajaran</h2>
					<div className="flex flex-wrap gap-2 mb-4">
						{HARI.map((h) => (
							<button
								key={h}
								onClick={() => setHariAktif(h)}
								className={`px-3 py-1 text-sm rounded-lg border ${
									hariAktif === h
										? "bg-white text-black border-white font-semibold"
										: "bg-white/5 border-white/20 hover:bg-white/10"
								}`}>
								{LABEL_HARI[h]}
							</button>
						))}
					</div>
					<div className={`${cardClass} flex flex-col gap-2 mb-10`}>
						{(jadwal[hariAktif] || []).length === 0 && (
							<p className="opacity-50 text-sm">Belum ada item untuk hari ini.</p>
						)}
						{(jadwal[hariAktif] || []).map((item, idx) => (
							<div key={idx} className="flex gap-2 items-center">
								<input
									type="text"
									value={item.subject}
									onChange={(e) => ubahItem(hariAktif, idx, "subject", e.target.value)}
									placeholder="Mata pelajaran"
									className={inputClass}
								/>
								<input
									type="text"
									value={item.time}
									onChange={(e) => ubahItem(hariAktif, idx, "time", e.target.value)}
									placeholder="07.00-08.20"
									className={`${inputClass} max-w-[130px]`}
								/>
								<label
									className="flex items-center gap-1 text-xs opacity-70 shrink-0"
									title="Tandai sebagai istirahat">
									<input
										type="checkbox"
										checked={!!item.isBreak}
										onChange={(e) => ubahItem(hariAktif, idx, "isBreak", e.target.checked)}
									/>
									Istirahat
								</label>
								<button
									type="button"
									onClick={() => hapusItem(hariAktif, idx)}
									className="px-2 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 shrink-0">
									&times;
								</button>
							</div>
						))}
						<div className="flex flex-wrap gap-2 mt-2">
							<button type="button" onClick={() => tambahItem(hariAktif)} className={primaryBtn}>
								+ Tambah Item
							</button>
							<button
								type="button"
								onClick={() => simpanJadwal(hariAktif)}
								className="py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 font-semibold text-sm">
								Simpan {LABEL_HARI[hariAktif]}
							</button>
							<button
								type="button"
								onClick={() => resetJadwalBawaan(hariAktif)}
								className="py-2 px-4 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 text-sm">
								Isi dari bawaan
							</button>
						</div>
					</div>

					{/* Tugas */}
					<h2 className="text-lg font-semibold mb-3">Tugas & PR</h2>
					<form onSubmit={addTask} className={`${cardClass} flex flex-col gap-2 mb-4`}>
						<input
							type="text"
							value={taskSubject}
							onChange={(e) => setTaskSubject(e.target.value)}
							placeholder="Mata pelajaran"
							className={inputClass}
						/>
						<textarea
							value={taskDescription}
							onChange={(e) => setTaskDescription(e.target.value)}
							placeholder="Deskripsi tugas"
							rows={2}
							className={`${inputClass} resize-none`}
						/>
						<input
							type="date"
							value={taskDeadline}
							onChange={(e) => setTaskDeadline(e.target.value)}
							className={inputClass}
						/>
						<button type="submit" className={primaryBtn}>
							Tambah Tugas
						</button>
					</form>
					<div className="flex flex-col gap-3 mb-10">
						{tasks.length === 0 && <p className="opacity-50 text-sm">Belum ada tugas.</p>}
						{tasks.map((task) => (
							<div key={task.id} className={`${cardClass} flex gap-3 items-center`}>
								<div className="flex-1 min-w-0">
									<p className="font-semibold">{task.subject}</p>
									<p className="text-sm opacity-70">{task.description}</p>
									<p className="text-xs opacity-40">Deadline: {task.deadline}</p>
								</div>
								<button onClick={() => deleteTask(task.id)} className={dangerBtn}>
									Hapus
								</button>
							</div>
						))}
					</div>

					{/* Pengumuman */}
					<h2 className="text-lg font-semibold mb-3">Pengumuman</h2>
					<form onSubmit={addAnnouncement} className={`${cardClass} flex flex-col gap-2 mb-4`}>
						<textarea
							value={announcementText}
							onChange={(e) => setAnnouncementText(e.target.value)}
							placeholder="Isi pengumuman (misal: Besok ulangan Matematika)"
							rows={2}
							className={`${inputClass} resize-none`}
						/>
						<label className="text-xs opacity-60">
							Tanggal hapus otomatis (opsional — kosongkan agar tidak pernah dihapus)
							<input
								type="date"
								value={announcementExpiry}
								onChange={(e) => setAnnouncementExpiry(e.target.value)}
								className={`${inputClass} mt-1`}
							/>
						</label>
						<button type="submit" className={primaryBtn}>
							Tambah Pengumuman
						</button>
					</form>
					<div className="flex flex-col gap-3 mb-10">
						{announcements.length === 0 && (
							<p className="opacity-50 text-sm">Belum ada pengumuman.</p>
						)}
						{announcements.map((item) => (
							<div key={item.id} className={`${cardClass} flex gap-3 items-center`}>
								<div className="flex-1 min-w-0">
								<p className="text-sm break-words">{item.text}</p>
								{item.expiresAt && (
									<p className="text-xs opacity-40 mt-1">🗑 hapus {item.expiresAt}</p>
								)}
							</div>
								<button onClick={() => deleteAnnouncement(item.id)} className={dangerBtn}>
									Hapus
								</button>
							</div>
						))}
					</div>

					{/* Ulang tahun */}
					<h2 className="text-lg font-semibold mb-3">Ulang Tahun</h2>
					<form onSubmit={addBirthday} className={`${cardClass} flex flex-col gap-2 mb-4`}>
						<input
							type="text"
							value={birthdayName}
							onChange={(e) => setBirthdayName(e.target.value)}
							placeholder="Nama siswa"
							className={inputClass}
						/>
						<input
							type="date"
							value={birthdayDate}
							onChange={(e) => setBirthdayDate(e.target.value)}
							className={inputClass}
						/>
						<button type="submit" className={primaryBtn}>
							Tambah Ulang Tahun
						</button>
					</form>
					<div className="flex flex-col gap-3 mb-10">
						{birthdays.length === 0 && (
							<p className="opacity-50 text-sm">Belum ada data ulang tahun.</p>
						)}
						{birthdays.map((b) => (
							<div key={b.id} className={`${cardClass} flex gap-3 items-center`}>
								<div className="flex-1 min-w-0">
									<p className="font-semibold">{b.name}</p>
									<p className="text-xs opacity-40">{b.date}</p>
								</div>
								<button onClick={() => deleteBirthday(b.id)} className={dangerBtn}>
									Hapus
								</button>
							</div>
						))}
					</div>

					{/* Acara */}
					<h2 className="text-lg font-semibold mb-3">Acara / Countdown</h2>
					<form onSubmit={addEvent} className={`${cardClass} flex flex-col gap-2 mb-4`}>
						<input
							type="text"
							value={eventTitle}
							onChange={(e) => setEventTitle(e.target.value)}
							placeholder="Nama acara (misal: Ujian Akhir Semester)"
							className={inputClass}
						/>
						<label className="text-xs opacity-60">
							Tanggal acara
							<input
								type="date"
								value={eventDate}
								onChange={(e) => setEventDate(e.target.value)}
								className={`${inputClass} mt-1`}
							/>
						</label>
						<label className="text-xs opacity-60">
							Tanggal hapus otomatis (opsional — bawaan: sehari setelah acara)
							<input
								type="date"
								value={eventExpiry}
								onChange={(e) => setEventExpiry(e.target.value)}
								className={`${inputClass} mt-1`}
							/>
						</label>
						<button type="submit" className={primaryBtn}>
							Tambah Acara
						</button>
					</form>
					<div className="flex flex-col gap-3">
						{events.length === 0 && <p className="opacity-50 text-sm">Belum ada acara.</p>}
						{events.map((ev) => (
							<div key={ev.id} className={`${cardClass} flex gap-3 items-center`}>
								<div className="flex-1 min-w-0">
									<p className="font-semibold">{ev.title}</p>
									<p className="text-xs opacity-40">
									{ev.date}
									{ev.expiresAt ? ` · 🗑 hapus ${ev.expiresAt}` : ""}
								</p>
								</div>
								<button onClick={() => deleteEvent(ev.id)} className={dangerBtn}>
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
