// Ditambahkan ke service worker PWA (lihat workbox.importScripts di
// vite.config.js). Menampilkan notifikasi push walaupun website sedang
// tidak dibuka, lalu membuka halaman yang sesuai saat notifikasinya diketuk.

self.addEventListener("push", (event) => {
	let data = {}
	try {
		data = event.data ? event.data.json() : {}
	} catch {
		data = { body: event.data ? event.data.text() : "" }
	}

	event.waitUntil(
		self.registration.showNotification(data.title || "XI PPLG 3", {
			body: data.body || "",
			icon: "/pwa-192.png",
			tag: data.tag,
			data: { url: data.url || "/" },
		}),
	)
})

self.addEventListener("notificationclick", (event) => {
	event.notification.close()
	const tujuan = new URL(event.notification.data?.url || "/", self.location.origin).href

	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((daftar) => {
			const tab = daftar.find((c) => c.url.startsWith(self.location.origin))
			if (tab) {
				return tab
					.focus()
					.then((c) => (c.url === tujuan ? c : c.navigate(tujuan)))
					.catch(() => self.clients.openWindow(tujuan))
			}
			return self.clients.openWindow(tujuan)
		}),
	)
})
