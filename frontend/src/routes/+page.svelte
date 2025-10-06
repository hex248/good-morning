<svelte:head>
    <title>Home</title>
    <meta name="description" content="Good Morning PWA" />
</svelte:head>

<script lang="ts">
    import { PUBLIC_BACKEND_URL } from '$env/static/public';

    interface User {
        id: string;
        username: string;
        email: string;
        uniqueCode: string;
        picture?: string;
        partner?: User;
    }

    interface PageData {
        user: User | null;
        partner: User | null;
        authenticated: boolean;
    }

    export let data: PageData;

    let authenticated: boolean = data.authenticated;
    let user: User | null = data.user;
    let partner: User | null = data.partner;

    let pairCode = '';
    let pairMessage = '';
    let newUsername = '';

    function loginWithGoogle() {
        window.location.href = `${PUBLIC_BACKEND_URL}/auth/google`;
    }

    async function handlePair() {
        try {
            const response = await fetch(`${PUBLIC_BACKEND_URL}/user/pair`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ pairCode }),
            });
            const data = await response.json();
            if (response.ok) {
                pairMessage = 'paired successfully';
                await refreshUserData();
            } else {
                pairMessage = data.error;
            }
        } catch (error) {
            pairMessage = 'failed to pair';
        }
    }

    async function refreshUserData() {
        try {
            const response = await fetch(`${PUBLIC_BACKEND_URL}/user/get`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                user = data.user;
                partner = data.partner;
            }
        } catch (error) {
            console.error('failed to refresh user data');
        }
    }
</script>

<body>
    <h1>good morning!</h1>
    {#if authenticated && user}
        {#if user.picture}
            <img src={user.picture} id="avatar" alt="avatar" />
        {/if}

        {#if partner}
            <div>
                <img src={partner.picture} id="avatar" alt="partner avatar" />
                <h3>your partner</h3>
                <p>username: {partner.username}</p>
                <p>unique code: {partner.uniqueCode}</p>
                <!-- unpair here -->
            </div>

        {:else}
            <div>
                <p>your unique code: {user.uniqueCode}</p>

                <h3>pair with partner</h3>
                <input type="text" bind:value={pairCode} placeholder="enter partner's unique code" />
                <button on:click={handlePair}>pair</button>
                {#if pairMessage}
                    <p>{pairMessage}</p>
                {/if}
            </div>
        {/if}



    {:else}
        <button on:click={loginWithGoogle}>login with google</button>
    {/if}
</body>

<style>
    body {
        width: 100vw;
        height: 100vh;
        background-color: #282828;
        color: white;
        font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 50px;

        padding-top: env(safe-area-inset-top);
        padding-right: env(safe-area-inset-right);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);

        font-size: 2.5rem;
        text-align: center;
        overflow: hidden;
        margin: 0;
        box-sizing: border-box;
    }

    h1 {
        font-weight: 600;
    }

    input {
        font-size: 1.5rem;
        padding: 10px;
        border-radius: 10px;
        border: 2px solid white;
        background-color: #404040;
        color: white;
        margin-right: 20px;
    }
    
    button {
        background-color: #282828;
        color: white;
        border: 3px solid white;
        padding: 20px 50px;
        font-size: 2rem;
        font-weight: 400;
        border-radius: 15px;
        cursor: pointer;
    }

    #avatar {
        border-radius: 100%;
        border: 2px solid white;
    }
</style>