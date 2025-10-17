self.addEventListener("push", (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || "/icon-192x192.png",
            badge: "/icon-192x192.png",
            tag: "good-morning-notification",
            requireInteraction: true,
            actions: [
                {
                    action: "view",
                    title: "view notice",
                },
                {
                    action: "dismiss",
                    title: "dismiss",
                },
            ],
        };
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    if (event.action === "view") {
        event.waitUntil(clients.openWindow("/"));
    }
});

self.addEventListener("install", (_event) => {
    // to activate immediately
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    // claim all clients
    event.waitUntil(self.clients.claim());
});
