// Sinkronkan isi .env lokal ke Environment Variables project Vercel.
// Jalankan: npm run env:push
import { readFileSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

const PROJECT = "xipplg3"
const TARGETS = ["production", "preview", "development"]
const ENV_FILE = ".env"

if (!existsSync(ENV_FILE)) {
	console.error(`✗ File ${ENV_FILE} tidak ditemukan. Salin dari .env.example dulu.`)
	process.exit(1)
}

const entries = readFileSync(ENV_FILE, "utf8")
	.split("\n")
	.map((line) => line.trim())
	.filter((line) => line && !line.startsWith("#"))
	.map((line) => {
		const idx = line.indexOf("=")
		return idx === -1 ? null : [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
	})
	.filter(Boolean)

const invalid = entries.filter(([key]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
if (invalid.length > 0) {
	console.error(`✗ Nama variabel tidak valid: ${invalid.map(([k]) => k).join(", ")}`)
	process.exit(1)
}

if (entries.length === 0) {
	console.error(`✗ Tidak ada variabel di ${ENV_FILE}.`)
	process.exit(1)
}

console.log(`Mengirim ${entries.length} variabel ke Vercel project "${PROJECT}"...\n`)

let failed = 0

for (const [key, value] of entries) {
	for (const target of TARGETS) {
		// Perintah dikirim sebagai satu string (bukan array argumen) supaya tidak
		// memicu DEP0190. Nilai variabel lewat stdin, jadi tidak pernah masuk ke
		// baris perintah; nama variabel sudah divalidasi di atas.
		const result = spawnSync(
			`npx --yes vercel env add ${key} ${target} --project ${PROJECT} --force`,
			{ input: value, encoding: "utf8", shell: true },
		)

		if (result.status !== 0) {
			failed++
			const detail = (result.stderr || result.stdout || "").trim().split("\n").slice(-2).join(" ")
			console.error(`  ✗ ${key} (${target}): ${detail}`)
		}
	}
	if (failed === 0) console.log(`  ✓ ${key}`)
}

if (failed > 0) {
	console.error(`\n✗ Selesai dengan ${failed} kegagalan.`)
	process.exit(1)
}

console.log(`\n✓ Semua variabel tersinkron. Deploy ulang supaya nilainya terpakai:`)
console.log(`  npx vercel --prod --project ${PROJECT}`)
