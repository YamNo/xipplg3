import React, { useEffect } from "react"
import AOS from "aos"
import "aos/dist/aos.css"

const Senin = React.lazy(() => import("../components/Mapel/Senin"))
const Selasa = React.lazy(() => import("../components/Mapel/Selasa"))
const Rabu = React.lazy(() => import("../components/Mapel/Rabu"))
const Kamis = React.lazy(() => import("../components/Mapel/Kamis"))
const Jumat = React.lazy(() => import("../components/Mapel/Jumat"))

const Schedule = () => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const currentDay = daysOfWeek[new Date().getDay()]

    useEffect(() => {
        AOS.init()
        AOS.refresh()
    }, [])

    const dayComponents = [
        null, // Kosongkan indeks 0
        Senin,
        Selasa,
        Rabu,
        Kamis,
        Jumat,
    ]

    // Menampilkan komponen berdasarkan hari saat ini
    const TodayComponent = dayComponents[new Date().getDay()]

    return (
        <>
            {/* Jadwal Mapel */}
            <div className="lg:flex lg:justify-center lg:gap-32 lg:mb-10 lg:mt-16 ">
                <div className="text-white flex flex-col justify-center items-center mt-8 md:mt-3 overflow-y-hidden">
                    <div className="text-2xl font-medium mb-5" data-aos="fade-up" data-aos-duration="500">
                        {currentDay}
                    </div>
                    <div data-aos="fade-up" data-aos-duration="400">
                        {TodayComponent ? (
                            <React.Suspense fallback={<p>Loading...</p>}>
                                <TodayComponent />
                            </React.Suspense>
                        ) : (
                            <p className="opacity-50">Tidak Ada Jadwal Hari Ini</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Schedule
