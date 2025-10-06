<svelte:head>
    <title>Home</title>
    <meta name="description" content="Good Morning PWA" />
</svelte:head>

<script lang="ts">
    import { onMount } from 'svelte';
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

    export let data: PageData;

    let authenticated: boolean = data.authenticated;
    let user: User | null = data.user;

    function loginWithGoogle() {
        window.location.href = `${PUBLIC_BACKEND_URL}/auth/google`;
    }
</script>

<body>
    <h1>good morning!</h1>
    {#if authenticated && user}
        <!-- {#if user.picture}
            <img src={user.picture} id="avatar" alt="avatar" />
        {/if} -->
        <p>Welcome, {user.username}!</p>
        <p>Your unique code: {user.uniqueCode}</p>
    {:else}
        <button on:click={loginWithGoogle}>Login with Google</button>
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