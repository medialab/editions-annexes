<script lang="ts">
	import { onMount } from 'svelte';
	import { isCoverDragging } from '$lib/stores';
	import { slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';

	let mouseX = $state(0);
	let mouseY = $state(0);
	let hoverLabel = $state('');
	let isPointerInside = $state(false);
	let isCoarsePointer = $state(false);

	const isVisible = $derived(
		!isCoarsePointer && isPointerInside && hoverLabel.length > 0 && !$isCoverDragging
	);

	function resolveHoverLabel(target: EventTarget | null): string {
		if (!(target instanceof Element)) return '';
		const hoveredElement = target.closest('[data-hover]');
		const nextLabel = hoveredElement?.getAttribute('data-hover')?.trim();
		return nextLabel ? nextLabel : '';
	}

	function handlePointerMove(event: PointerEvent) {
		isPointerInside = true;
		mouseX = event.clientX;
		mouseY = event.clientY;
		hoverLabel = resolveHoverLabel(event.target);
	}

	function handlePointerOver(event: PointerEvent) {
		isPointerInside = true;
		hoverLabel = resolveHoverLabel(event.target);
	}

	function handlePointerOut(event: PointerEvent) {
		hoverLabel = resolveHoverLabel(event.relatedTarget);
	}

	function handlePointerLeave() {
		isPointerInside = false;
		hoverLabel = '';
	}

	function handleWindowBlur() {
		isPointerInside = false;
		hoverLabel = '';
	}

	onMount(() => {
		if (typeof window === 'undefined') return;

		const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
		const noHoverQuery = window.matchMedia('(hover: none)');
		const updatePointerType = () => {
			isCoarsePointer = coarsePointerQuery.matches || noHoverQuery.matches;
		};

		updatePointerType();
		coarsePointerQuery.addEventListener('change', updatePointerType);
		noHoverQuery.addEventListener('change', updatePointerType);

		return () => {
			coarsePointerQuery.removeEventListener('change', updatePointerType);
			noHoverQuery.removeEventListener('change', updatePointerType);
		};
	});
</script>

<svelte:window
	onpointermove={handlePointerMove}
	onpointerover={handlePointerOver}
	onpointerout={handlePointerOut}
	onpointerleave={handlePointerLeave}
	onblur={handleWindowBlur}
/>

{#key hoverLabel}
	<div
		aria-hidden="true"
		class="pointer-events-none fixed top-0 left-0 z-120 hidden rounded-full border border-neutral-300 bg-white/95 px-3 py-1 text-nowrap text-neutral-700 shadow-[0_8px_24px_rgba(15,23,42,0.14)] backdrop-blur transition-[opacity,transform] duration-150 ease-out will-change-transform md:block"
		class:opacity-100={isVisible}
		class:opacity-0={!isVisible}
		class:scale-100={isVisible}
		class:scale-95={!isVisible}
		style={`transform: translate3d(${mouseX + 14}px, ${mouseY + 14}px, 0);`}
		in:slide={{ duration: 200, easing: cubicInOut, axis: 'x', delay: 25 }}
		out:slide={{ duration: 200, easing: cubicInOut, axis: 'x' }}
	>
		<p>
			{@html hoverLabel}
		</p>
	</div>
{/key}
