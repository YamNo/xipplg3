import { useEffect, useState } from "react"
import Swal from "sweetalert2"
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
	deleteField,
	addDoc,
	writeBatch,
	serverTimestamp,
} from "firebase/firestore"
import { useAdminAuth } from "../hooks/useAdminAuth"
import { kabariPush } from "../utils/push"
import { HARI, LABEL_HARI, DEFAULT_JADWAL, DEFAULT_STRUKTUR } from "../data/defaults"

const inputClass =
	"px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none text-sm w-full"
const primaryBtn =
	"py-2 px-4 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200 disabled:opacity-50"
const dangerBtn = "px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 shrink-0 disabled:opacity-50"
const editBtn = "px-3 py-1 text-sm rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 shrink-0"
const greenBtn = "px-3 py-1 text-sm rounded-lg bg-green-600 hover:bg-green-700 shrink-0 disabled:opacity-50"
const cardClass = "bg-white/5 border border-white/10 rounded-xl p-3"

const TABS = [
	["foto", "Foto"],
	["chat", "Chat"],
	["tugas", "Tugas"],
	["info", "Info Kelas"],
	["jadwal", "Jadwal"],
]
const TAB_KEY = "adminTab"

// Kolom yang bisa diubah lewat tombol Edit, per koleksi.
const FORM_EDIT = {
	assignments: [
		{ key: "subject", label: "Mata pelajaran", type: "text", wajib: true },
		{ key: "description", label: "Deskripsi", type: "textarea" },
		{ key: "deadline", label: "Deadline", type: "date", wajib: true },
	],
	announcements: [
		{ key: "text", label: "Isi pengumuman", type: "textarea", wajib: true },
		{ key: "expiresAt", label: "Tanggal hapus otomatis (opsional)", type: "date" },
	],
	birthdays: [
		{ key: "name", label: "Nama siswa", type: "text", wajib: true },
		{ key: "date", label: "Tanggal lahir", type: "date", wajib: true },
	],
	events: [
		{ key: "title", label: "Nama acara", type: "text", wajib: true },
		{ key: "date", label: "Tanggal acara", type: "date", wajib: true },
		{ key: "expiresAt", label: "Tanggal hapus otomatis (opsional)", type: "date" },
	],
}

// Pop-up "Yakin hapus?" — mengembalikan true kalau admin menekan Hapus.
const konfirmasi = async (judul, teks) => {
	const hasil = await Swal.fire({
		icon: "warning",
		title: judul,
		text: teks,
		showCancelButton: true,
		confirmButtonText: "Ya, hapus",
		cancelButtonText: "Batal",
		confirmButtonColor: "#dc2626",
		reverseButtons: true,
		focusCancel: true,
		customClass: { container: "sweet-alert-container" },
	})
	return hasil.isConfirmed
}

const potong = (teks = "", n = 60) => (teks.length > n ? `${teks.slice(0, n)}…` : teks)

const AdminLogin = () => {
	const { user, isAdmin, checking, error: authError, login, logout } = useAdminAuth()

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
	const [dimuat, setDimuat] = useState(false)
	const [notice, setNotice] = useState("")
	const [sibuk, setSibuk] = useState(false)

	const [tab, setTab] = useState(() => {
		try {
			const t = localStorage.getItem(TAB_KEY)
			return TABS.some(([k]) => k === t) ? t : "foto"
		} catch {
			return "foto"
		}
	})
	// Item yang sedang diedit: { koleksi, id, data }.
	const [edit, setEdit] = useState(null)
	// Pilihan untuk aksi massal (foto & chat).
	const [pilihFoto, setPilihFoto] = useState(() => new Set())
	const [pilihChat, setPilihChat] = useState(() => new Set())

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

		// Buang pilihan yang datanya sudah tidak ada.
		const adaFoto = new Set(img.map((i) => i.id))
		const adaChat = new Set(ch.map((c) => c.id))
		setPilihFoto((prev) => new Set([...prev].filter((id) => adaFoto.has(id))))
		setPilihChat((prev) => new Set([...prev].filter((id) => adaChat.has(id))))

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
		setDimuat(true)
	}

	useEffect(() => {
		if (isAdmin) fetchAll()
	}, [isAdmin])

	const gantiTab = (t) => {
		setTab(t)
		setEdit(null)
		try {
			localStorage.setItem(TAB_KEY, t)
		} catch {
			// abaikan
		}
	}

	const flash = (msg) => {
		setNotice(msg)
		setTimeout(() => setNotice(""), 3000)
	}

	const handleLogin = async (e) => {
		e.preventDefault()
		setLoggingIn(true)
		await login(password)
		setLoggingIn(false)
	}

	// Hapus satu dokumen setelah dikonfirmasi.
	const hapusSatu = async (koleksi, id, judul, teks) => {
		if (!(await konfirmasi(judul, teks))) return
		await deleteDoc(doc(db, koleksi, id))
		if (edit?.id === id) setEdit(null)
		flash("Data dihapus.")
		fetchAll()
	}

	// --- Edit ---
	const mulaiEdit = (koleksi, item) => {
		const data = Object.fromEntries(FORM_EDIT[koleksi].map((f) => [f.key, item[f.key] || ""]))
		setEdit({ koleksi, id: item.id, data })
	}
	const simpanEdit = async (e) => {
		e.preventDefault()
		const { koleksi, id, data } = edit
		const kolom = FORM_EDIT[koleksi]
		const kurang = kolom.find((f) => f.wajib && !String(data[f.key]).trim())
		if (kurang) {
			flash(`${kurang.label} wajib diisi.`)
			return
		}
		const ubah = {}
		for (const f of kolom) {
			const v = String(data[f.key] || "").trim()
			// Kolom opsional yang dikosongkan dihapus dari dokumen.
			ubah[f.key] = !f.wajib && !v ? deleteField() : v
		}
		setSibuk(true)
		try {
			await updateDoc(doc(db, koleksi, id), ubah)
			setEdit(null)
			flash("Perubahan disimpan.")
			fetchAll()
		} catch (err) {
			console.error("Gagal menyimpan perubahan:", err)
			flash("Gagal menyimpan perubahan.")
		} finally {
			setSibuk(false)
		}
	}

	// --- Aksi massal ---
	const togglePilih = (setter, id) =>
		setter((prev) => {
			const baru = new Set(prev)
			baru.has(id) ? baru.delete(id) : baru.add(id)
			return baru
		})
	const pilihSemua = (setter, ids, nyala) =>
		setter((prev) => {
			const baru = new Set(prev)
			ids.forEach((id) => (nyala ? baru.add(id) : baru.delete(id)))
			return baru
		})

	// Firestore membatasi 500 operasi per batch.
	const jalankanBatch = async (ids, aksi) => {
		for (let i = 0; i < ids.length; i += 450) {
			const batch = writeBatch(db)
			ids.slice(i, i + 450).forEach((id) => aksi(batch, id))
			await batch.commit()
		}
	}

	const hapusMassal = async (koleksi, setter, ids, nama) => {
		if (ids.length === 0) return
		if (!(await konfirmasi(`Hapus ${ids.length} ${nama}?`, "Data yang dihapus tidak bisa dikembalikan.")))
			return
		setSibuk(true)
		try {
			await jalankanBatch(ids, (batch, id) => batch.delete(doc(db, koleksi, id)))
			setter(new Set())
			flash(`${ids.length} ${nama} dihapus.`)
			fetchAll()
		} catch (err) {
			console.error("Gagal hapus massal:", err)
			flash("Gagal menghapus sebagian data.")
		} finally {
			setSibuk(false)
		}
	}

	// --- Foto ---
	const approveImage = async (id) => {
		await updateDoc(doc(db, "images", id), { status: "approved" })
		fetchAll()
	}
	const setujuiMassal = async (ids) => {
		if (ids.length === 0) return
		setSibuk(true)
		try {
			await jalankanBatch(ids, (batch, id) => batch.update(doc(db, "images", id), { status: "approved" }))
			setPilihFoto((prev) => new Set([...prev].filter((id) => !ids.includes(id))))
			flash(`${ids.length} foto disetujui.`)
			fetchAll()
		} catch (err) {
			console.error("Gagal menyetujui foto:", err)
			flash("Gagal menyetujui sebagian foto.")
		} finally {
			setSibuk(false)
		}
	}

	// --- Tugas ---
	const addTask = async (e) => {
		e.preventDefault()
		if (!taskSubject.trim() || !taskDeadline) return
		const baru = await addDoc(collection(db, "assignments"), {
			subject: taskSubject.trim(),
			description: taskDescription.trim(),
			deadline: taskDeadline,
			createdAt: serverTimestamp(),
		})
		kabariPush("assignments", baru.id)
		setTaskSubject("")
		setTaskDescription("")
		setTaskDeadline("")
		fetchAll()
	}

	// --- Pengumuman ---
	const addAnnouncement = async (e) => {
		e.preventDefault()
		if (!announcementText.trim()) return
		const baru = await addDoc(collection(db, "announcements"), {
			text: announcementText.trim(),
			createdAt: serverTimestamp(),
			...(announcementExpiry ? { expiresAt: announcementExpiry } : {}),
		})
		kabariPush("announcements", baru.id)
		setAnnouncementText("")
		setAnnouncementExpiry("")
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

	// --- Acara ---
	const addEvent = async (e) => {
		e.preventDefault()
		if (!eventTitle.trim() || !eventDate) return
		const baru = await addDoc(collection(db, "events"), {
			title: eventTitle.trim(),
			date: eventDate,
			...(eventExpiry ? { expiresAt: eventExpiry } : {}),
		})
		kabariPush("events", baru.id)
		setEventTitle("")
		setEventDate("")
		setEventExpiry("")
		fetchAll()
	}

	// --- Chat ---
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
						Masukkan password admin.
					</p>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Password"
						autoComplete="current-password"
						autoFocus
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

	const fotoDipilih = [...pilihFoto]
	const pendingDipilih = pending.filter((i) => pilihFoto.has(i.id)).map((i) => i.id)
	const chatDipilih = [...pilihChat]

	const badgeTab = { foto: pending.length, chat: chatHariIni }

	// Kotak centang "pilih semua" untuk satu kelompok data.
	const centangSemua = (ids, terpilih, setter) => {
		const semua = ids.length > 0 && ids.every((id) => terpilih.has(id))
		return (
			<label className="flex items-center gap-2 text-xs opacity-70 cursor-pointer select-none">
				<input
					type="checkbox"
					checked={semua}
					disabled={ids.length === 0}
					onChange={(e) => pilihSemua(setter, ids, e.target.checked)}
				/>
				Pilih semua
			</label>
		)
	}

	// Kartu data biasa (tugas, pengumuman, dll.) yang bisa diedit & dihapus.
	const renderItem = (koleksi, item, isi, labelHapus) => {
		if (edit?.koleksi === koleksi && edit.id === item.id) {
			return (
				<form key={item.id} onSubmit={simpanEdit} className={`${cardClass} flex flex-col gap-2 border-white/30`}>
					<p className="text-xs opacity-60">Mengedit</p>
					{FORM_EDIT[koleksi].map((f) => (
						<label key={f.key} className="text-xs opacity-80">
							{f.label}
							{f.type === "textarea" ? (
								<textarea
									value={edit.data[f.key]}
									onChange={(e) =>
										setEdit({ ...edit, data: { ...edit.data, [f.key]: e.target.value } })
									}
									rows={2}
									className={`${inputClass} mt-1 resize-y`}
								/>
							) : (
								<input
									type={f.type}
									value={edit.data[f.key]}
									onChange={(e) =>
										setEdit({ ...edit, data: { ...edit.data, [f.key]: e.target.value } })
									}
									className={`${inputClass} mt-1`}
								/>
							)}
						</label>
					))}
					<div className="flex gap-2 mt-1">
						<button type="submit" disabled={sibuk} className={greenBtn}>
							{sibuk ? "Menyimpan..." : "Simpan"}
						</button>
						<button type="button" onClick={() => setEdit(null)} className={editBtn}>
							Batal
						</button>
					</div>
				</form>
			)
		}
		return (
			<div key={item.id} className={`${cardClass} flex gap-3 items-center`}>
				<div className="flex-1 min-w-0">{isi}</div>
				<div className="flex gap-2 shrink-0">
					<button onClick={() => mulaiEdit(koleksi, item)} className={editBtn}>
						Edit
					</button>
					<button
						onClick={() => hapusSatu(koleksi, item.id, "Yakin hapus?", labelHapus)}
						className={dangerBtn}>
						Hapus
					</button>
				</div>
			</div>
		)
	}

	const renderImageCard = (img) => (
		<div key={img.id} className={`${cardClass} flex gap-3 items-center`}>
			<input
				type="checkbox"
				checked={pilihFoto.has(img.id)}
				onChange={() => togglePilih(setPilihFoto, img.id)}
				aria-label="Pilih foto"
				className="shrink-0"
			/>
			<a href={img.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
				<img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg" />
			</a>
			<div className="flex-1 min-w-0">
				<p className="text-xs opacity-60 truncate">{img.url}</p>
				<p className="text-xs opacity-40">
					{img.createdAt?.toDate ? img.createdAt.toDate().toLocaleString("id-ID") : ""}
				</p>
			</div>
			<div className="flex gap-2 shrink-0">
				{img.status !== "approved" && (
					<button onClick={() => approveImage(img.id)} className={greenBtn}>
						Approve
					</button>
				)}
				<button
					onClick={() =>
						hapusSatu("images", img.id, "Yakin hapus foto ini?", "Foto akan hilang dari Class Gallery.")
					}
					className={dangerBtn}>
					Hapus
				</button>
			</div>
		</div>
	)

	// Bilah aksi massal yang muncul saat ada yang dicentang.
	const bilahMassal = (jumlah, onBatal, children) =>
		jumlah > 0 ? (
			<div className="sticky top-[4.5rem] z-10 bg-[#2a1f33]/95 backdrop-blur border border-white/20 rounded-xl px-3 py-2 mb-4 flex flex-wrap items-center gap-2">
				<span className="text-sm font-semibold mr-auto">{jumlah} dipilih</span>
				{children}
				<button onClick={onBatal} className={editBtn}>
					Batal
				</button>
			</div>
		) : null

	return (
		<div className="min-h-screen text-white px-6 py-10 max-w-3xl mx-auto">
			<div className="flex justify-between items-start mb-2 gap-4">
				<h1 className="text-2xl font-bold">Panel Admin</h1>
				<div className="text-right shrink-0">
					<p className="text-xs opacity-50 break-all">{user.name}</p>
					<button onClick={logout} className="text-sm opacity-60 hover:underline">
						Logout
					</button>
				</div>
			</div>

			{/* Statistik */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 mt-4">
				{[
					["Foto pending", pending.length, "foto"],
					["Pesan hari ini", chatHariIni, "chat"],
					["Tugas aktif", tugasAktif, "tugas"],
					["IP diblokir", blockedIps.length, "chat"],
				].map(([label, angka, tujuan]) => (
					<button
						key={label}
						onClick={() => gantiTab(tujuan)}
						className={`${cardClass} text-center hover:bg-white/10`}>
						<p className="text-2xl font-bold">{angka}</p>
						<p className="text-xs opacity-50 mt-1">{label}</p>
					</button>
				))}
			</div>

			{/* Tab */}
			<div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-[#1e1e1e]/90 backdrop-blur mb-4">
				<div className="flex gap-2 overflow-x-auto">
					{TABS.map(([k, label]) => (
						<button
							key={k}
							onClick={() => gantiTab(k)}
							className={`px-4 py-2 text-sm rounded-lg border whitespace-nowrap flex items-center gap-2 ${
								tab === k
									? "bg-white text-black border-white font-semibold"
									: "bg-white/5 border-white/20 hover:bg-white/10"
							}`}>
							{label}
							{badgeTab[k] > 0 && (
								<span
									className={`text-[0.65rem] font-bold rounded-full px-1.5 py-0.5 ${
										tab === k ? "bg-black text-white" : "bg-pink-500 text-white"
									}`}>
									{badgeTab[k]}
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{notice && (
				<div className="bg-green-600/20 border border-green-500/40 rounded-lg px-3 py-2 text-sm mb-4">
					{notice}
				</div>
			)}

			{loading && !dimuat ? (
				<p className="opacity-60">Memuat data...</p>
			) : (
				<>
					{/* ===== Foto ===== */}
					{tab === "foto" && (
						<>
							{bilahMassal(
								fotoDipilih.length,
								() => setPilihFoto(new Set()),
								<>
								{pendingDipilih.length > 0 && (
									<button disabled={sibuk} onClick={() => setujuiMassal(pendingDipilih)} className={greenBtn}>
										Setujui ({pendingDipilih.length})
									</button>
								)}
								<button
									disabled={sibuk}
									onClick={() => hapusMassal("images", setPilihFoto, fotoDipilih, "foto")}
									className={dangerBtn}>
									Hapus ({fotoDipilih.length})
								</button>
								</>,
							)}

							<div className="flex justify-between items-center mb-3 gap-3">
								<h2 className="text-lg font-semibold">Menunggu Persetujuan ({pending.length})</h2>
								{centangSemua(pending.map((i) => i.id), pilihFoto, setPilihFoto)}
							</div>
							<div className="flex flex-col gap-3 mb-8">
								{pending.length === 0 && <p className="opacity-50 text-sm">Tidak ada.</p>}
								{pending.map(renderImageCard)}
							</div>

							<div className="flex justify-between items-center mb-3 gap-3">
								<h2 className="text-lg font-semibold">Disetujui ({approved.length})</h2>
								{centangSemua(approved.map((i) => i.id), pilihFoto, setPilihFoto)}
							</div>
							<div className="flex flex-col gap-3">
								{approved.length === 0 && <p className="opacity-50 text-sm">Tidak ada.</p>}
								{approved.map(renderImageCard)}
							</div>
						</>
					)}

					{/* ===== Chat ===== */}
					{tab === "chat" && (
						<>
							{bilahMassal(
								chatDipilih.length,
								() => setPilihChat(new Set()),
								<button
									disabled={sibuk}
									onClick={() => hapusMassal("chats", setPilihChat, chatDipilih, "pesan")}
									className={dangerBtn}>
									Hapus ({chatDipilih.length})
								</button>,
							)}

							<div className="flex justify-between items-center mb-3 gap-3">
								<h2 className="text-lg font-semibold">Text Anonim ({chats.length} pesan)</h2>
								{centangSemua(chats.map((c) => c.id), pilihChat, setPilihChat)}
							</div>
							<div className="flex flex-col gap-3 mb-10">
								{chats.length === 0 && <p className="opacity-50 text-sm">Belum ada pesan.</p>}
								{chats.map((c) => (
									<div key={c.id} className={`${cardClass} flex gap-3 items-center`}>
										<input
											type="checkbox"
											checked={pilihChat.has(c.id)}
											onChange={() => togglePilih(setPilihChat, c.id)}
											aria-label="Pilih pesan"
											className="shrink-0"
										/>
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
											<button
												onClick={() =>
													hapusSatu("chats", c.id, "Yakin hapus pesan ini?", `"${potong(c.message)}"`)
												}
												className={dangerBtn}>
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
							<div className="flex flex-col gap-2">
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
						</>
					)}

					{/* ===== Tugas ===== */}
					{tab === "tugas" && (
						<>
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
							<div className="flex flex-col gap-3">
								{tasks.length === 0 && <p className="opacity-50 text-sm">Belum ada tugas.</p>}
								{tasks.map((task) =>
									renderItem(
										"assignments",
										task,
										<>
											<p className="font-semibold">{task.subject}</p>
											<p className="text-sm opacity-70 break-words">{task.description}</p>
											<p className="text-xs opacity-40">Deadline: {task.deadline}</p>
										</>,
										`Tugas "${task.subject}" akan dihapus.`,
									),
								)}
							</div>
						</>
					)}

					{/* ===== Info Kelas ===== */}
					{tab === "info" && (
						<>
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
								{announcements.map((item) =>
									renderItem(
										"announcements",
										item,
										<>
											<p className="text-sm break-words">{item.text}</p>
											{item.expiresAt && (
												<p className="text-xs opacity-40 mt-1">🗑 hapus {item.expiresAt}</p>
											)}
										</>,
										`Pengumuman "${potong(item.text)}" akan dihapus.`,
									),
								)}
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
							<div className="flex flex-col gap-3 mb-10">
								{events.length === 0 && <p className="opacity-50 text-sm">Belum ada acara.</p>}
								{events.map((ev) =>
									renderItem(
										"events",
										ev,
										<>
											<p className="font-semibold">{ev.title}</p>
											<p className="text-xs opacity-40">
												{ev.date}
												{ev.expiresAt ? ` · 🗑 hapus ${ev.expiresAt}` : ""}
											</p>
										</>,
										`Acara "${ev.title}" akan dihapus.`,
									),
								)}
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
								{birthdays.map((b) =>
									renderItem(
										"birthdays",
										b,
										<>
											<p className="font-semibold">{b.name}</p>
											<p className="text-xs opacity-40">{b.date}</p>
										</>,
										`Data ulang tahun ${b.name} akan dihapus.`,
									),
								)}
							</div>

							{/* Struktur kelas */}
							<h2 className="text-lg font-semibold mb-3">Struktur Kelas</h2>
							<form onSubmit={simpanStruktur} className={`${cardClass} flex flex-col gap-2`}>
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
						</>
					)}

					{/* ===== Jadwal ===== */}
					{tab === "jadwal" && (
						<>
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
							<div className={`${cardClass} flex flex-col gap-2`}>
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
								<p className="text-xs opacity-50 mt-1">
									Tombol &times; hanya menghapus baris di form ini — perubahan baru tersimpan setelah
									menekan Simpan.
								</p>
							</div>
						</>
					)}
				</>
			)}
		</div>
	)
}

export default AdminLogin
