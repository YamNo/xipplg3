// Daftarkan webhook bot Telegram ke serverless function di Vercel.
// Jalankan: npm run telegram:setup
//
// Butuh di .env:
//   TELEGRAM_BOT_TOKEN   token dari @BotFather
//   TELEGRAM_SECRET      string rahasia bebas (dipakai memverifikasi webhook)
//   TELEGRAM_WEBHOOK_URL alamat function, mis. https://xipplg3.vercel.app/api/telegram
import { readFileSync, existsSync } from "node:fs"

if (!existsSync(".env")) {
	console.error("✗ File .env tidak ditemukan.")
	process.exit(1)
}

const env = Object.fromEntries(
	readFileSync(".env", "utf8")
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#"))
		.map((l) => {
			const i = l.indexOf("=")
			return i === -1 ? null : [l.slice(0, i).trim(), l.slice(i + 1).trim()]
		})
		.filter(Boolean),
)

const token = env.TELEGRAM_BOT_TOKEN
const secret = env.TELEGRAM_SECRET
const url = env.TELEGRAM_WEBHOOK_URL || "https://xipplg3.vercel.app/api/telegram"

if (!token) {
	console.error("✗ TELEGRAM_BOT_TOKEN belum ada di .env.")
	console.error("  Buat bot lewat @BotFather di Telegram, lalu salin token-nya ke .env.")
	process.exit(1)
}
if (!secret) {
	console.error("✗ TELEGRAM_SECRET belum ada di .env (isi string rahasia bebas).")
	process.exit(1)
}

const api = (metode, body) =>
	fetch(`https://api.telegram.org/bot${token}/${metode}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body || {}),
	}).then((r) => r.json())

const info = await api("getMe")
if (!info.ok) {
	console.error("✗ Token tidak valid:", info.description)
	process.exit(1)
}
console.log(`✓ Bot terhubung: @${info.result.username} (${info.result.first_name})`)

const hasil = await api("setWebhook", {
	url,
	secret_token: secret,
	allowed_updates: ["message", "edited_message"],
	drop_pending_updates: true,
})

if (!hasil.ok) {
	console.error("✗ Gagal memasang webhook:", hasil.description)
	process.exit(1)
}
console.log(`✓ Webhook dipasang ke ${url}`)

const cek = await api("getWebhookInfo")
console.log("\nStatus webhook:")
console.log(`  url               : ${cek.result.url}`)
console.log(`  pending updates   : ${cek.result.pending_update_count}`)
if (cek.result.last_error_message) {
	console.log(`  error terakhir    : ${cek.result.last_error_message}`)
}

console.log(`\nSelesai. Buka Telegram, cari @${info.result.username}, kirim /start.`)
