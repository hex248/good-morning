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
    picture?: string;
    partner?: User;
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
    color: string;
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

export function loginWithGoogle() {
    window.location.href = `${API_BASE_URL}/auth/google`;
}

export default api;
