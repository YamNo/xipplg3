import { useEffect } from "react"
import { useLocation } from "react-router-dom"

// Selalu mulai dari bagian paling atas halaman, baik saat web pertama dibuka,
// saat di-refresh, maupun saat pindah halaman.
const ScrollToTop = () => {
	const { pathname } = useLocation()

	useEffect(() => {
		window.scrollTo(0, 0)
	}, [pathname])

	return null
}

export default ScrollToTop
