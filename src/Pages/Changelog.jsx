import Footer from "./Footer"

// Daftar perubahan website, terbaru di paling atas.
// Setiap ada update, tambahkan entri baru di paling atas array ini.
const CHANGELOG = [
	{
		version: "v1.4",
		date: "23 Agustus 2026",
		changes: [
			{
				type: "Baru",
				text: "Email & password admin dipindah ke environment variable, jadi bisa diganti tanpa mengubah kode.",
			},
			{
				type: "Baru",
				text: "Panel admin bisa moderasi Text Anonim: hapus pesan dan blokir IP pengirim.",
			},
			{
				type: "Baru",
				text: "Jadwal pelajaran dan struktur kelas bisa diubah langsung dari panel admin.",
			},
			{
				type: "Baru",
				text: "Ringkasan statistik di panel admin: foto pending, pesan hari ini, tugas aktif, IP diblokir.",
			},
			{
				type: "Perbaikan",
				text: "Validasi data diperketat: panjang pesan chat dibatasi dan foto baru wajib lewat persetujuan admin.",
			},
			{
				type: "Perbaikan",
				text: "Website selalu terbuka dari bagian paling atas, tidak lagi meneruskan posisi scroll sebelumnya.",
			},
			{
				type: "Perbaikan",
				text: "Foto kelas kini terlihat jelas di tampilan HP, tidak lagi terpotong atau tertutup tombol.",
			},
			{
				type: "Baru",
				text: "Notifikasi Tugas/PR ikut muncul di popup beranda, di HP maupun desktop.",
			},
		],
	},
	{
		version: "v1.3",
		date: "15 Agustus 2026",
		changes: [
			{
				type: "Perbaikan",
				text: "Deploy dari GitHub tidak lagi gagal — config Firebase dipindah ke environment variable.",
			},
			{
				type: "Perbaikan",
				text: "Website tidak lagi terbuka dalam posisi ter-scroll ke bawah.",
			},
			{
				type: "Perbaikan",
				text: "Jarak antar foto Class Gallery dirapatkan, terutama di layar tablet.",
			},
			{ type: "Perbaikan", text: "Bersihkan peringatan aksesibilitas di console browser." },
			{ type: "Perbaikan", text: "Link TIM PPLG3 dihapus dari footer." },
		],
	},
	{
		version: "v1.2",
		date: "15 Agustus 2026",
		changes: [
			{ type: "Baru", text: "Halaman Tugas & PR di /TugasPR, lengkap dengan tombol aktifkan notifikasi." },
			{ type: "Baru", text: "Notifikasi popup di beranda berisi pengumuman, ulang tahun, dan hitung mundur acara." },
			{ type: "Baru", text: "Badge jumlah tugas aktif di menu Tugas & PR." },
			{ type: "Baru", text: "Panel admin bisa kelola pengumuman, ulang tahun, dan acara." },
			{ type: "Baru", text: "Halaman Changelog ini." },
			{ type: "Perbaikan", text: "Tampilan loading (skeleton) di Class Gallery dan Text Anonim." },
			{ type: "Perbaikan", text: "Ukuran foto galeri menyesuaikan layar HP supaya tidak meluber." },
			{ type: "Perbaikan", text: "Tombol Send dan Request kini sejajar dan seukuran." },
		],
	},
	{
		version: "v1.1",
		date: "15 Agustus 2026",
		changes: [
			{ type: "Baru", text: "Panel admin di /login/admin untuk menyetujui foto dan mengelola tugas." },
			{ type: "Baru", text: "Halaman Tim Kami di /created." },
			{ type: "Baru", text: "Filter kata kasar dan jeda 3 detik antar pesan di Text Anonim." },
			{ type: "Perbaikan", text: "Upload foto dipindah ke Cloudinary supaya tetap gratis." },
			{ type: "Perbaikan", text: "Foto latar beranda tidak lagi tertutup tombol." },
		],
	},
	{
		version: "v1.0",
		date: "Rilis awal",
		changes: [
			{ type: "Baru", text: "Beranda, Class Gallery, Struktur Kelas, Jadwal, dan Text Anonim." },
		],
	},
]

const badgeStyle = (type) =>
	type === "Baru"
		? "bg-green-500/80"
		: type === "Perbaikan"
		? "bg-blue-500/80"
		: "bg-white/20"

const Changelog = () => {
	return (
		<div className="text-white min-h-screen flex flex-col">
			<div className="px-[10%] py-16 lg:py-20 max-w-2xl mx-auto flex-1 w-full">
				<h1 className="text-3xl md:text-4xl font-bold text-center mb-3" id="Glow">
					Changelog
				</h1>
				<p className="text-center opacity-50 text-sm mb-12">
					Catatan fitur baru dan perbaikan website kelas XI PPLG 3.
				</p>

				<div className="flex flex-col gap-8">
					{CHANGELOG.map((release) => (
						<div key={release.version}>
							<div className="flex items-baseline gap-3 mb-3">
								<h2 className="text-xl font-bold">{release.version}</h2>
								<span className="text-xs opacity-40">{release.date}</span>
							</div>
							<div className="flex flex-col gap-2">
								{release.changes.map((change, i) => (
									<div key={i} className="InfoCard flex items-start gap-3">
										<span
											className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeStyle(
												change.type,
											)}`}>
											{change.type}
										</span>
										<p className="text-sm opacity-80 break-words">{change.text}</p>
									</div>
								))}
							</div>
						</div>
					))}
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

export default Changelog
