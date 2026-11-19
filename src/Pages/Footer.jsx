// Kata-kata di bawah logo, berganti setiap hari.
const KATA_KATA = [
	"Satu kelas, satu cerita, satu keluarga.",
	"Ngoding boleh error, semangat jangan.",
	"Bareng-bareng dari kelas X, sampai lulus nanti.",
	"Tugas boleh numpuk, kenangan jangan sampai lupa.",
	"Bukan cuma teman sekelas, tapi teman seperjuangan.",
	"Bug hari ini, pelajaran untuk besok.",
	"Kecil-kecil jadi developer, besar-besar jadi legenda.",
	"Masa SMK cuma sekali, bikin yang paling seru.",
]

const kataHariIni = () => {
	const d = new Date()
	const hariKe = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
	return KATA_KATA[hariKe % KATA_KATA.length]
}

const Footer = () => {
	return (
		<footer className="" id="Footer">
			<div className="mx-auto w-full max-w-screen-xl px-8 py-6 lg:py-8">
				<div className="md:flex md:justify-between">
					<div className="mb-6 md:mb-0">
						<a href="/" className="flex items-center gap-3">
							<img
								src="/LogoPPLG3.jpg"
								alt="Logo LEVN XI-III"
								className="h-[4.5rem] w-[4.5rem] right-2 relative rounded-full shrink-0"
							/>
							<span className="flex flex-col text-white">
								<span className="text-xl font-bold leading-tight">LEVN XI-III</span>
								<span className="text-xs opacity-60">XI PPLG 3 · SMK Media Informatika</span>
							</span>
						</a>
						<p className="text-sm text-white opacity-70 italic mt-4 max-w-xs">“{kataHariIni()}”</p>
					</div>
					<div className="grid grid-cols-2 gap-8">
						<div className=" ">
							<h2 className="mb-4 text-sm font-semibold uppercase text-white">CREATED BY</h2>
							<ul className="text-gray-400 dark:text-gray-400 font-medium">
								<li className="mb-2">
									<a
										href="https://discord.gg/Nu4a9ytera"
										target="_blank"
										rel="noopener noreferrer"
										className="hover:underline">
										Nusa Studios
									</a>
								</li>
								<li className="mb-2">
									<a href="/Changelog" className="hover:underline">
										Changelog
									</a>
								</li>
								<li className="mb-2">
									<a href="/Penghitung_Skor" className="hover:underline">
										Penghitung Skor
									</a>
								</li>
								<li className="mb-2">
									<a href="/login/admin" className="hover:underline">
										Panel Admin
									</a>
								</li>
							</ul>
						</div>
						<div className="">
							<h2 className="mb-4 text-sm font-semibold uppercase text-white">Follow us</h2>
							<ul className="text-gray-400 dark:text-gray-400 font-medium">
								<li className="mb-2">
									<a href="https://www.instagram.com/levn.pp3lg/?hl=id" className="hover:underline ">
										Instagram
									</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
				<hr className="my-2 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
				<div className="sm:flex sm:items-center sm:justify-between">
					<div className="flex mt-4 justify-center sm:mt-0">
						<p className="text-[0.7rem] text-white opacity-70">
							© {new Date().getFullYear()} Kelas XI PPLG 3 | Di Kelola Oleh Siswa PPLG 3
						</p>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer
