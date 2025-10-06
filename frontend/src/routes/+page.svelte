<svelte:head>
	<title>Home</title>
	<meta name="description" content="Good Morning PWA" />
</svelte:head>

<body>
	<h1>good morning!</h1>
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
	}

	h1 {
		font-weight: 600;
	}
</style>