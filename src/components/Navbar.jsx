import React, { useEffect, useState } from "react"
import { db } from "../firebase"
import { collection, onSnapshot } from "firebase/firestore"

const Navbar = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [activeTaskCount, setActiveTaskCount] = useState(0)

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen)
	}

	useEffect(() => {
		const unsubscribe = onSnapshot(
			collection(db, "assignments"),
			(snapshot) => {
				const today = new Date().toLocaleDateString("sv-SE") // format YYYY-MM-DD lokal
				const active = snapshot.docs.filter((d) => (d.data().deadline || "") >= today)
				setActiveTaskCount(active.length)
			},
			(err) => console.error("Gagal menghitung tugas aktif:", err),
		)
		return () => unsubscribe()
	}, [])

	const Badge = () =>
		activeTaskCount > 0 ? (
			<span className="ml-2 text-[0.7rem] font-bold bg-pink-500 text-white rounded-full px-2 py-0.5 align-middle">
				{activeTaskCount}
			</span>
		) : null

	return (
		<>
			{/* Mobile */}
			<div className="flex justify-between relative top-3 lg:hidden">
				<div className="w-10 h-10 rounded-full flex justify-center items-center UserButton">
					<img src="/NavIcon.png" alt="" className="w-6 h-6" onClick={toggleMenu} />
				</div>
				<div className={`text-center text-white ${isMenuOpen ? "hidden" : ""}`}>
					<div className="text-[0.7rem]">Hi, visitor!</div>
					<div className="font-bold text-[1rem]">WELCOME</div>
				</div>

				<div className="w-10 h-10 rounded-full flex justify-center items-center UserButton">
					<img src="/user.svg" alt="" className="" />
				</div>

				{isMenuOpen && (
					<div className="fixed inset-0 bg-black opacity-50 z-10" onClick={toggleMenu}></div>
				)}

				<div
					className={`fixed top-0 left-0 h-full w-64  shadow-lg transform transition-transform duration-300 ease-in-out ${
						isMenuOpen ? "translate-x-0" : "-translate-x-full"
					}`}
					id="IsiNavbar">
					<ul className="mt-8">
						<li className="mb-4">
							<a href="#" className="text-white opacity-80 text-lg font-bold">
								Home
							</a>
						</li>
						<li className="mb-4">
							<a href="#Gallery" className="text-white opacity-80 text-lg font-bold">
								Gallery
							</a>
						</li>
						<li className="mb-4">
							<a href="#Tabs" className="text-white opacity-80 text-lg font-bold">
								Structure & Schedule
							</a>
						</li>
						<li>
							<a href="/TugasPR" className="text-white opacity-80 text-lg font-bold">
								Tugas & PR
								<Badge />
							</a>
						</li>
					</ul>
				</div>
			</div>

			{/* Dekstop */}
			<div className="flex justify-between relative top-3 hidden lg:flex">
				<div>
					<a href="https://smkmediainformatika.sch.id/" target="_blank" rel="noopener noreferrer">
						<img src="/LogoMETIK.png" className="w-12 h-12 rounded-full" alt="" />
					</a>
				</div>
				<ul className="mt-2 flex gap-5">
					<li className="mb-4">
						<a href="#" className="text-white opacity-80 text-[1rem] font-semibold">
							Home
						</a>
					</li>
					<li className="mb-4">
						<a href="#Gallery" className="text-white opacity-80 text-[1rem] font-semibold">
							Gallery
						</a>
					</li>
					<li className="mb-4">
						<a href="#Tabs" className="text-white opacity-80 text-[1rem] font-semibold">
							Structure & Schedule
						</a>
					</li>
					<li>
						<a href="/TugasPR" className="text-white opacity-80 text-[1rem] font-semibold">
							Tugas & PR
							<Badge />
						</a>
					</li>
				</ul>
			</div>
		</>
	)
}

export default Navbar
