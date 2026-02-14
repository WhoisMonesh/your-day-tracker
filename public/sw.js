self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "notify") {
    const title = data.title || "Reminder";
    const options = {
      body: data.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.tag || undefined,
      data: data.data || undefined,
    };
    self.registration.showNotification(title, options);
  }
});
