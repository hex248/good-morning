import { PUBLIC_BACKEND_URL } from '$env/static/public';

interface User {
    id: string;
    username: string;
    email: string;
    uniqueCode: string;
    picture?: string;
}

interface PageData {
    user: User | null;
    authenticated: boolean;
}

export async function load({ fetch }: { fetch: typeof globalThis.fetch }): Promise<PageData> {
    try {
        const response = await fetch(`${PUBLIC_BACKEND_URL}/me`, {
            credentials: 'include' // include cookies
        });
        if (response.ok) {
            const data = await response.json();
            return {
                user: data.user,
                authenticated: true
            };
        }
    } catch (error) {
        console.error('authentication check failed:', error);
    }
    return {
        user: null,
        authenticated: false
    };
}