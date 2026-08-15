import Footer from "./Footer"

const Created = () => {
	return (
		<div className="text-white">
			<div id="Home" className="px-[10%] flex flex-col items-center text-center py-24 md:py-32">
				<img
					src="/LogoPPLG3.jpg"
					alt=""
					className="h-20 w-20 rounded-full brightness-200 mb-8"
				/>

				<h5 className="text-[1.1rem] font-semibold opacity-80">Di Balik Layar</h5>
				<h1 className="text-4xl md:text-6xl font-extrabold mt-2" id="Glow">
					Tim Kami
				</h1>
				<p className="max-w-md mt-6 opacity-70 leading-relaxed">
					Website Kelas XI PPLG 3 ini dirancang dan dibangun langsung oleh siswa,
					sebagai wadah dokumentasi dan informasi seputar kelas.
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-16 w-full max-w-2xl">
					<div className="bg-white/5 border border-white/10 rounded-2xl p-8">
						<div className="w-14 h-14 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-2xl">
							💻
						</div>
						<p className="text-xl font-bold">Arfah putra subandi</p>
						<p className="opacity-60 mt-2 leading-relaxed">
							Merancang dan membangun keseluruhan website ini dari nol, mulai dari
							tampilan, fitur Text Anonim, galeri kelas, sampai menghubungkannya
							ke database dan meng-online-kannya.
						</p>
					</div>
					<div className="bg-white/5 border border-white/10 rounded-2xl p-8">
						<div className="w-14 h-14 rounded-full bg-white/10 mx-auto mb-4 flex items-center justify-center text-2xl">
							🎨
						</div>
						<p className="text-xl font-bold">Reza Misbach</p>
						<p className="opacity-60 mt-2 leading-relaxed">
							Mendesain logo kelas XI PPLG 3 yang dipakai sebagai identitas visual
							di seluruh website ini, dari logo di navbar sampai footer.
						</p>
					</div>
				</div>

				<a href="/" className="mt-16 text-sm opacity-70 hover:underline">
					&larr; Kembali ke beranda
				</a>
			</div>

			<Footer />
		</div>
	)
}

export default Created
