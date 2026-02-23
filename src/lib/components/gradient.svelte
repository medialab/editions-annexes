<script>
	let gradientIntensity = $state(0);
</script>

{#snippet gradient()}
	<stop offset="0%" stop-color="white" stop-opacity="1" />
	<stop offset="2%" stop-color="white" stop-opacity="1" />
	<stop offset="30%" stop-color="white" stop-opacity="0" />
	<stop offset="100%" stop-color="white" stop-opacity="0" />
{/snippet}

<svg
	width="100%"
	height="100%"
	viewBox="0 0 100 100"
	preserveAspectRatio="none"
	xmlns="http://www.w3.org/2000/svg"
	class="pointer-events-none fixed top-0 right-0 bottom-0 left-0 z-20 h-dvh w-dvw"
>
	<defs>
		<linearGradient id="gTop" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="50">
			{@render gradient()}
		</linearGradient>
		<linearGradient id="gRight" gradientUnits="userSpaceOnUse" x1="100" y1="0" x2="50" y2="0">
			{@render gradient()}
		</linearGradient>
		<linearGradient id="gBottom" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="50">
			{@render gradient()}
		</linearGradient>
		<linearGradient id="gLeft" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="50" y2="0">
			{@render gradient()}
		</linearGradient>
	</defs>

	<path d="M0 0 L100 0 L50 50 Z" fill="url(#gTop)" />
	<path d="M100 0 L100 100 L50 50 Z" fill="url(#gRight)" />
	<path d="M100 100 L0 100 L50 50 Z" fill="url(#gBottom)" />
	<path d="M0 100 L0 0 L50 50 Z" fill="url(#gLeft)" />
</svg>
