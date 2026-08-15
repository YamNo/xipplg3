// Daftar kata kasar/tidak pantas (Indonesia & Inggris) dalam bentuk dasar.
// Normalisasi di bawah menangani variasi leetspeak/simbol seperti "k@nt0l" atau "k o n t o l".
const BLOCKED_WORDS = [
	// Indonesia - umpatan umum
	"anjing", "anjir", "anjrit", "asu", "asw", "bangsat", "bangke", "bangkai",
	"babi", "brengsek", "bajingan", "biadab", "bego", "goblok", "goblog",
	"tolol", "idiot", "kampret", "keparat", "sialan", "jancok", "jancuk",
	"diancuk", "kunyuk", "dongo", "dungu",
	// Indonesia - vulgar/seksual
	"kontol", "memek", "meki", "pepek", "itil", "toket", "tetek", "ngentot",
	"entot", "ngewe", "colmek", "coli", "pukimak", "puki", "lonte", "pelacur",
	"sundal", "germo", "cabul", "perek",
	// Inggris
	"fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "bastard",
	"whore", "cock", "nigger",
]

// Peta substitusi karakter leetspeak umum ke huruf aslinya.
const LEET_MAP = {
	"4": "a", "@": "a",
	"8": "b",
	"3": "e",
	"1": "i", "!": "i", "|": "i",
	"0": "o",
	"$": "s", "5": "s",
	"7": "t", "+": "t",
	"9": "g",
}

// Menormalkan teks: lowercase, ganti leetspeak, buang karakter non-huruf
// (spasi/simbol pemisah), lalu ciutkan huruf berulang agar bypass seperti
// "k.o.n.t.o.l" atau "kooontol" tetap terdeteksi.
const normalize = (text) => {
	const lower = text.toLowerCase()
	const deLeeted = lower
		.split("")
		.map((char) => LEET_MAP[char] ?? char)
		.join("")
	const lettersOnly = deLeeted.replace(/[^a-z]/g, "")
	return lettersOnly.replace(/(.)\1{2,}/g, "$1")
}

export const containsProfanity = (text) => {
	if (!text) return false
	const normalized = normalize(text)
	return BLOCKED_WORDS.some((word) => normalized.includes(word))
}
