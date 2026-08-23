// Nilai bawaan yang dipakai kalau data di Firestore belum ada.
// Ini juga yang di-seed ke Firestore lewat panel admin (tombol "Isi dari bawaan").

export const HARI = ["senin", "selasa", "rabu", "kamis", "jumat"]

export const LABEL_HARI = {
	senin: "Senin",
	selasa: "Selasa",
	rabu: "Rabu",
	kamis: "Kamis",
	jumat: "Jumat",
}

export const DEFAULT_STRUKTUR = {
	waliKelas: "Kristia Ninggutomo",
	ketua: "Antoni Oktariansyah",
	wakil: "Reza Misbach",
	sekretaris: ["Salzabila Aurel liya", "Safa Zulaika Ibrahim"],
}

export const DEFAULT_JADWAL = {
	senin: [
		{ subject: "Konsentrasi Keahlian", time: "07.30-08.50", isBreak: false },
		{ subject: "Konsentrasi Keahlian", time: "08.50-10.30", isBreak: false },
		{ subject: "Istirahat", time: "10.30-10.50", isBreak: true },
		{ subject: "Pendidikan Agama Islam", time: "10.50-12.00", isBreak: false },
		{ subject: "Simulasi Digital", time: "12.00-13.10", isBreak: false },
		{ subject: "Istirahat", time: "13.10-13.40", isBreak: true },
		{ subject: "Kreatifitas, Inovasi, dan Kewirausahaan", time: "13.40-15.00", isBreak: false },
	],
	selasa: [
		{ subject: "Bahasa Indonesia", time: "07.00-08.20", isBreak: false },
		{ subject: "Pendidikan Pancasila", time: "08.20-10.00", isBreak: false },
		{ subject: "Istirahat", time: "10.00-10.30", isBreak: true },
		{ subject: "Pemrograman Berorientasi Objek", time: "10.30-11.50", isBreak: false },
		{ subject: "Kreatifitas, Inovasi, dan Kewirausahaan", time: "11.50-13.10", isBreak: false },
		{ subject: "Istirahat", time: "13.10-13.40", isBreak: true },
		{ subject: "Konsentrasi Keahlian", time: "13.40-15.00", isBreak: false },
	],
	rabu: [
		{ subject: "Bahasa Inggris", time: "07.00-08.20", isBreak: false },
		{ subject: "Konsentrasi Keahlian", time: "08.20-10.00", isBreak: false },
		{ subject: "Istirahat", time: "10.00-10.30", isBreak: true },
		{ subject: "Bahasa Indonesia", time: "10.30-11.50", isBreak: false },
		{ subject: "Matematika", time: "11.50-13.10", isBreak: false },
		{ subject: "Istirahat", time: "13.10-13.40", isBreak: true },
		{ subject: "Bahasa Inggris", time: "13.40-14.20", isBreak: false },
		{ subject: "Bimbingan Konseling", time: "14.20-15.00", isBreak: false },
	],
	kamis: [
		{ subject: "Pendidikan, Jasmani, Olahraga dan Kesehatan", time: "07.00-08.20", isBreak: false },
		{ subject: "Sejarah", time: "08.20-10.00", isBreak: false },
		{ subject: "Istirahat", time: "10.00-10.30", isBreak: true },
		{ subject: "Konsentrasi Keahlian", time: "10.30-11.50", isBreak: false },
		{ subject: "Konsentrasi Keahlian", time: "11.50-13.10", isBreak: false },
		{ subject: "Istirahat", time: "13.10-13.40", isBreak: true },
		{ subject: "Konsentrasi Keahlian", time: "13.40-15.00", isBreak: false },
	],
	jumat: [
		{ subject: "English for Specific Purposes", time: "07.30-08.40", isBreak: false },
		{ subject: "Matematika", time: "08.40-10.05", isBreak: false },
		{ subject: "Istirahat", time: "10.05-10.25", isBreak: true },
		{ subject: "Pemrograman Berorientasi Objek", time: "10.25-11.35", isBreak: false },
	],
}
