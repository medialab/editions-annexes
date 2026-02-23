<script>
	import Button from './button.svelte';
	import infoIcon from '$lib/assets/icons/info.svg';
	import homeIcon from '$lib/assets/icons/homeIcon.svg';
	import annexesIcon from '$lib/assets/icons/annexes.png';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { homeHref, aboutHref } from '$lib/stores';
</script>

<header
	class="fixed top-6 right-4 left-4 z-30 flex h-12.5 items-center justify-between rounded-2xl bg-white p-2 md:right-auto md:left-1/2 md:w-full md:max-w-[60%] md:-translate-x-1/2"
>
	<a
		href={homeHref}
		onclick={() => goto(homeHref)}
		class="flex h-full flex-col items-center justify-center overflow-clip"
	>
		<img src={annexesIcon} alt="annexes logo" class="h-7.5 w-auto" />
	</a>

	<div class="hidden md:block">
		{#if page.url.pathname !== '/about'}
			<Button label="About" icon={infoIcon} href={aboutHref} onClick={() => goto(aboutHref)}
			></Button>
		{:else}
			<Button href={homeHref} icon={homeIcon} onClick={() => goto(homeHref)}></Button>
		{/if}
	</div>
	<div class="md:hidden">
		{#if page.url.pathname !== '/about'}
			<Button icon={infoIcon} href={aboutHref} onClick={() => goto(aboutHref)}></Button>
		{:else}
			<Button href={homeHref} icon={homeIcon} onClick={() => goto(homeHref)}></Button>
		{/if}
	</div>
</header>
