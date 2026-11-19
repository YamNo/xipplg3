import { useEffect, useState } from "react"
import { pushDidukung, iosBelumDipasang, aktifkanPush, matikanPush, sinkronkanPush } from "../utils/push"

// Tombol untuk menyalakan notifikasi push (muncul walaupun website ditutup).
const TombolNotif = () => {
	const [status, setStatus] = useState("memuat") // memuat | mati | aktif | diblokir | ios | tidak
	const [sibuk, setSibuk] = useState(false)
	const [pesan, setPesan] = useState("")

	useEffect(() => {
		if (iosBelumDipasang()) return setStatus("ios")
		if (!pushDidukung()) return setStatus("tidak")
		if (Notification.permission === "denied") return setStatus("diblokir")
		sinkronkanPush()
			.then((aktif) => setStatus(aktif ? "aktif" : "mati"))
			.catch(() => setStatus("mati"))
	}, [])

	const aktifkan = async () => {
		setSibuk(true)
		setPesan("")
		try {
			await aktifkanPush()
			setStatus("aktif")
		} catch (err) {
			if (Notification.permission === "denied") setStatus("diblokir")
			else setPesan(err.message)
		} finally {
			setSibuk(false)
		}
	}

	const matikan = async () => {
		setSibuk(true)
		try {
			await matikanPush()
			setStatus("mati")
		} finally {
			setSibuk(false)
		}
	}

	if (status === "memuat" || status === "tidak") return null

	return (
		<div className="InfoCard flex items-start gap-3 max-w-md">
			<span className="text-xl leading-none">🔔</span>
			<div className="min-w-0 flex-1 text-white">
				{status === "aktif" && (
					<>
						<p className="text-sm font-semibold">Notifikasi aktif</p>
						<p className="text-xs opacity-70 mt-1">
							Kamu akan dapat notif tugas baru, pengumuman, acara, dan pengingat deadline walaupun
							website ditutup.
						</p>
						<button onClick={matikan} disabled={sibuk} className="text-xs underline opacity-70 mt-2">
							{sibuk ? "Memproses..." : "Matikan notifikasi"}
						</button>
					</>
				)}

				{status === "mati" && (
					<>
						<p className="text-sm font-semibold">Dapatkan notifikasi kelas</p>
						<p className="text-xs opacity-70 mt-1">
							Tugas baru, pengumuman, dan pengingat deadline langsung muncul di HP-mu, tanpa perlu
							membuka website.
						</p>
						<button
							onClick={aktifkan}
							disabled={sibuk}
							className="mt-3 px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200 disabled:opacity-60">
							{sibuk ? "Memproses..." : "Aktifkan Notifikasi"}
						</button>
						{pesan && <p className="text-xs text-red-300 mt-2">{pesan}</p>}
					</>
				)}

				{status === "diblokir" && (
					<>
						<p className="text-sm font-semibold">Notifikasi diblokir</p>
						<p className="text-xs opacity-70 mt-1">
							Izinkan notifikasi untuk situs ini lewat ikon gembok di samping alamat web (atau
							Pengaturan → Aplikasi → XI PPLG 3 → Notifikasi), lalu muat ulang halaman.
						</p>
					</>
				)}

				{status === "ios" && (
					<>
						<p className="text-sm font-semibold">Mau dapat notifikasi di iPhone?</p>
						<p className="text-xs opacity-70 mt-1">
							Ketuk tombol Bagikan di Safari → <b>Tambah ke Layar Utama</b>, lalu buka website dari
							ikon itu dan aktifkan notifikasi di sana.
						</p>
					</>
				)}
			</div>
		</div>
	)
}

export default TombolNotif
