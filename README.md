# XI PPLG 3: Website Kelas

Website resmi kelas **XI PPLG 3 (LEVN XI-III)**, SMK Media Informatika. Isinya jadwal pelajaran, tugas & PR, galeri kelas, Text Anonim, dan info kelas. Website ini bisa dipasang ke layar utama HP seperti aplikasi, lengkap dengan notifikasi.

🌐 **Live:** https://xipplg3.vercel.app

---

## Fitur

| Untuk siswa | Untuk admin |
|---|---|
| Pelajaran sekarang & berikutnya di beranda | Panel admin per tab: Foto · Chat · Tugas · Info Kelas · Jadwal |
| Jadwal pelajaran & struktur kelas | Tambah, **edit**, dan hapus tugas/pengumuman/acara/ulang tahun |
| Tugas & PR (`/TugasPR`) | Moderasi foto & Text Anonim, termasuk aksi massal |
| Class Gallery (upload foto, lewat persetujuan admin) | Blokir IP pengirim Text Anonim |
| Text Anonim | Bot Telegram untuk mengisi data & menyetujui foto dari chat |
| Notifikasi push walaupun web ditutup | |
| Pengingat pagi: deadline besok, acara, ulang tahun | |
| Bisa dipasang ke HP (PWA) | |
| Penghitung Skor (`/Penghitung_Skor`) & Changelog (`/Changelog`) | |

---

## Teknologi

- **Frontend:** React 18 + Vite, Tailwind CSS, MUI
- **Database:** Firebase Firestore
- **Foto:** Cloudinary
- **Hosting & API:** Vercel (serverless function di folder `api/`, Vercel Cron)
- **Notifikasi:** Web Push (VAPID) melalui service worker PWA (`vite-plugin-pwa`)

---

## Menjalankan di komputer sendiri

Butuh **Node.js 18+**.

```bash
npm install
cp .env.example .env     # lalu isi nilainya (lihat tabel di bawah)
npm run dev              # buka http://localhost:5173
```

> Notifikasi push **tidak jalan** di `npm run dev` karena service worker belum aktif.
> Untuk mencobanya, jalankan `npm run build && npm run preview`.

### Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Menjalankan hasil build (PWA & push aktif) |
| `npm run lint` | Cek kode dengan ESLint |
| `npm run env:push` | Salin isi `.env` ke Environment Variables Vercel |
| `npm run telegram:setup` | Daftarkan webhook bot Telegram |

---

## Environment variable

Semua variabel ada di [`.env.example`](.env.example). File `.env` **tidak** ikut ke GitHub.

| Variabel | Dipakai di | Keterangan |
|---|---|---|
| `VITE_FIREBASE_*` | Browser | Config Firebase (Project Settings → Your apps) |
| `VITE_ADMIN_PASSWORD` | Browser | Password panel admin |
| `VITE_VAPID_PUBLIC_KEY` | Browser + server | Kunci publik notifikasi push |
| `VAPID_PRIVATE_KEY` | Server | Kunci rahasia notifikasi push |
| `CRON_SECRET` | Server | Mengamankan endpoint pengingat harian |
| `TELEGRAM_BOT_TOKEN` | Server | Token dari @BotFather |
| `TELEGRAM_SECRET` | Server | Rahasia untuk memverifikasi webhook |
| `TELEGRAM_ALLOWED_IDS` | Server | User ID Telegram yang boleh memakai bot (pisah koma) |
| `TELEGRAM_WEBHOOK_URL` | Script | Alamat `/api/telegram` di Vercel |

Buat pasangan kunci VAPID baru dengan:

```bash
npx web-push generate-vapid-keys
```

> ⚠️ Nilai berawalan `VITE_` ikut tertanam di JavaScript yang dikirim ke browser, jadi bisa dibaca pengunjung. Jangan menaruh rahasia server dengan awalan `VITE_`.

---

## Deploy

1. Isi `.env`, lalu jalankan `npm run env:push`.
2. Salin isi [`firestore.rules`](firestore.rules) ke **Firebase Console → Firestore → Rules → Publish**. Ulangi setiap kali file ini berubah.
3. Push ke GitHub. Vercel akan build dan deploy otomatis.
4. Kalau bot Telegram baru dipasang atau alamatnya berubah, jalankan `npm run telegram:setup`.

Pengingat harian berjalan lewat Vercel Cron (lihat [`vercel.json`](vercel.json)) sekitar pukul **06.00 WIB**.

---

## Panel admin

Buka **Panel Admin** di footer, atau langsung ke `/login/admin`, lalu masukkan password admin. Sesi berakhir otomatis setelah 4 jam.

## Bot Telegram

Kirim `/bantuan` ke bot untuk melihat semua perintah. Ringkasnya:

```
/tugas Matematika | kerjakan hal 42 | 2026-08-30
/pengumuman Besok ulangan Matematika | hapus 2026-08-30
/acara Classmeet | 2026-09-01
/ultah Budi Santoso | 2010-05-17
/daftar
```

Data yang masuk lewat bot langsung tampil di web dan mengirim notifikasi ke HP siswa yang sudah mengaktifkan notifikasi.

---

## Struktur folder

```
api/                 Serverless function Vercel
  _lib/push.js       Pengirim notifikasi push (dipakai bersama)
  telegram.js        Webhook bot Telegram
  notify-push.js     Notifikasi untuk data baru dari panel admin
  notify-foto.js     Kirim foto baru ke Telegram untuk dimoderasi
  cron-pengingat.js  Pengingat harian
public/              Gambar, ikon PWA, push-sw.js
scripts/             Script bantu (sinkron env, setup Telegram)
src/
  Pages/             Halaman (Home, TugasPR, AdminLogin, Changelog, ...)
  components/        Komponen (NotifPopup, TombolNotif, PelajaranSekarang, ...)
  data/defaults.js   Jadwal & struktur bawaan
  hooks/             useAdminAuth
  utils/             Push, Cloudinary, filter kata kasar, kedaluwarsa data
firestore.rules      Aturan keamanan Firestore
```

---

## Kontribusi

- Setiap ada perubahan, **tambahkan entri di [`src/Pages/Changelog.jsx`](src/Pages/Changelog.jsx)** (paling atas).
- Jalankan `npm run lint` dan `npm run build` sebelum push.

## Catatan keamanan

Login admin masih memakai password di environment variable `VITE_`, dan rules Firestore untuk sebagian koleksi masih terbuka. Rencana perbaikannya adalah memindahkan login admin ke **Firebase Authentication** lalu mengunci rules supaya hanya admin yang bisa mengubah data.

---

Dibuat oleh **[Nusa Studios](https://discord.gg/Nu4a9ytera)** untuk kelas XI PPLG 3 · Logo: LEVN XI-III 2026
