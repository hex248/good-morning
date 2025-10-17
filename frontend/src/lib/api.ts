import axios from "axios";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:24804";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // include cookies for JWT
});

export interface User {
    id: string;
    username: string;
    email: string;
    uniqueCode: string;
    notificationsEnabled: boolean;
    picture?: string;
    partner?: User;
}

export interface Notice {
    id: string;
    senderId: string;
    recipientId: string;
    message?: string;
    photoUrl?: string;
    songUrl?: string;
    songTitle?: string;
    songArtist?: string;
    songAlbumCover?: string;
    songExplanation?: string;
    foregroundColor: string;
    backgroundColor: string;
    reactions: string[];
    sentAt: string;
    editedAt?: string;
    resetAt: string;
}

export interface AuthResponse {
    user: User | null;
    partner: User | null;
    authenticated: boolean;
}

export async function checkAuth(): Promise<AuthResponse> {
    try {
        const response = await api.get("/me");
        if (response.status === 200) {
            return {
                user: response.data.user,
                partner: response.data.partner,
                authenticated: true,
            };
        }
    } catch (error: unknown) {
        // 401 is expected for unauthenticated users
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
            console.error("authentication check failed:", error);
        }
    }
    return {
        user: null,
        partner: null,
        authenticated: false,
    };
}

export async function pairUser(
    pairCode: string
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await api.post("/user/pair", { pairCode });
        if (response.status === 200) {
            return { success: true, message: "paired successfully" };
        } else {
            return {
                success: false,
                message: response.data.error || "failed to pair",
            };
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
            console.error("failed to pair user:", error);
        }
        return { success: false, message: "failed to pair" };
    }
}

export async function getUserData(): Promise<{
    user: User | null;
    partner: User | null;
}> {
    try {
        const response = await api.get("/user/get");
        if (response.status === 200) {
            return {
                user: response.data.user,
                partner: response.data.partner,
            };
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
            console.error("failed to get user data:", error);
        }
    }
    return { user: null, partner: null };
}

export async function editUsername(
    username: string
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await api.put("/user/edit", { username });
        if (response.status === 200) {
            return { success: true, message: "username updated" };
        } else {
            return {
                success: false,
                message: response.data.error || "failed to update",
            };
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
            console.error("failed to update username:", error);
        }
        return { success: false, message: "failed to update username" };
    }
}

export async function createNotice(noticeData: {
    message?: string;
    photoUrl?: string;
    songUrl?: string;
    songExplanation?: string;
    foregroundColor: string;
    backgroundColor: string;
}): Promise<{ success: boolean; message: string }> {
    try {
        const response = await api.post("/notices/create", noticeData);
        if (response.status === 200) {
            return { success: true, message: "notice created successfully" };
        } else {
            return {
                success: false,
                message: response.data.error || "failed to create notice",
            };
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
            console.error("failed to create notice:", error);
        }
        return { success: false, message: "failed to create notice" };
    }
}

export async function getNotice(): Promise<{ notice: Notice | null }> {
    try {
        const response = await api.get("/notices/get");
        if (response.status === 200) {
            return { notice: response.data.notice };
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
            console.error("failed to get notice:", error);
        }
    }
    return { notice: null };
}

export async function getVapidPublicKey(): Promise<string | null> {
    try {
        const response = await api.get("/push/vapid-public-key");
        if (response.status === 200) {
            return response.data.vapidPublicKey;
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
            console.error("failed to get VAPID public key:", error);
        }
    }
    return null;
}

export async function subscribeToPush(): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            return { success: false, message: "Push not supported" };
        }

        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = await getVapidPublicKey();
        if (!vapidPublicKey) {
            return { success: false, message: "failed to get VAPID key" };
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const p256dhKey = subscription.getKey("p256dh");
        const authKey = subscription.getKey("auth");

        if (!p256dhKey || !authKey) {
            return {
                success: false,
                message: "failed to get subscription keys",
            };
        }

        const response = await api.post("/push/subscribe", {
            endpoint: subscription.endpoint,
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey),
        });

        if (response.status === 200) {
            return { success: true, message: "subscribed successfully" };
        } else {
            return {
                success: false,
                message: response.data.error || "failed to subscribe",
            };
        }
    } catch (error: unknown) {
        console.error("failed to subscribe to push:", error);
        return { success: false, message: "failed to subscribe" };
    }
}

export async function unsubscribeFromPush(): Promise<{
    success: boolean;
    message: string;
}> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
        }

        const response = await api.delete("/push/unsubscribe");
        if (response.status === 200) {
            return { success: true, message: "unsubscribed successfully" };
        } else {
            return {
                success: false,
                message: response.data.error || "failed to unsubscribe",
            };
        }
    } catch (error: unknown) {
        console.error("failed to unsubscribe from push:", error);
        return { success: false, message: "failed to unsubscribe" };
    }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function loginWithGoogle() {
    window.location.href = `${API_BASE_URL}/auth/google`;
}

export default api;
