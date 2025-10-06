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

    onMount(() => {
        console.log('authenticated:', authenticated, 'user:', user);
    });
</script>

<body>
    <h1>good morning!</h1>
    {#if authenticated && user}
        <p>welcome, {user.username}!</p>
        <p>your unique code: {user.uniqueCode}</p>
    {:else}
        <button on:click={loginWithGoogle}>Login with Google</button>
    {/if}
</body>

<style>
    body {
        width: 99vw;
        /* width: 99.159%; */
        height: 99vh;
        background-color: #282828;
        color: white;
        font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;

        padding-top: env(safe-area-inset-top);
        padding-right: env(safe-area-inset-right);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);

        font-size: 50px;
        text-align: center;
    }

    h1 {
        font-weight: 600;
    }
</style>