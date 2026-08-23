import BoxClassIg from "../components/BoxClassIg"
import BoxTextAnonim from "../components/BoxTextAnonim"
import Navbar from "../components/Navbar"

const Home = () => {
	return (
		<div className="text-white">
			<div className="px-[10%]" id="Home">
				<Navbar />
				{/* Di HP hero hanya berisi foto kelas — tombol dipindah ke bawah
				    supaya fotonya tidak tertutup. */}
				<div className="lg:hidden h-[52vh]"></div>

				{/* Dekstop */}
				<div className="hidden lg:block">
					<div className="flex justify-center items-center flex-col h-[100vh]">
						<h5 className="text-[1.4rem] font-semibold">Hi, Visitor!</h5>
						<h1 className="text-7xl font-extrabold Glow">
							WELCOME
						</h1>
						<h6 className="text-sm" style={{ letterSpacing: "5px" }}>
							TO XI PPLG 3
						</h6>
					</div>
				</div>
			</div>

			<div className="px-[10%] lg:hidden">
				<div
					className="border-2 flex justify-between px-10 text-4xl font-bold py-2 relative"
					id="TotalSiswa">
					<div className="flex items-center justify-center AngkaGradientBlue">
						26
					</div>
					<div className="">
						<span className="text-5xl AngkaGradientBlue">
							3
						</span>
						<span className="text-5xl AngkaGradientPink">
							0
						</span>
					</div>
					<div className="flex items-center justify-center AngkaGradientPink">
						4
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 items-stretch mt-6">
					<BoxClassIg />
					<BoxTextAnonim />
				</div>
			</div>
		</div>
	)
}

export default Home
