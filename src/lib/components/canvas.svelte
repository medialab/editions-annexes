<script lang="ts">
	import { onMount } from 'svelte';
	import { getEditionElements, openPanel, isTitleShowing, currentEdition } from '$lib/stores';
	import type { Edition } from '$lib/types';
	import { cubicInOut, expoIn, quadIn, quadInOut } from 'svelte/easing';
	import { draw, fly } from 'svelte/transition';
	import Gradient from '$lib/components/gradient.svelte';

	let { editions = [] } = $props<{ editions?: Edition[] }>();

	let canvasCovers = $derived.by<CanvasCover[]>(() =>
		editions.flatMap((edition: Edition, editionIndex: number) =>
			getEditionElements(edition.name).map((element: string, elementIndex: number) => ({
				key: `${editionIndex}-${elementIndex}-${element}`,
				edition,
				element
			}))
		)
	);

	$inspect('canvasCovers:', canvasCovers);

	type Placement = {
		x: number;
		y: number;
		width: number;
		height: number;
		rotate: number;
	};

	type PlacementResult = {
		placements: Placement[];
		usedWidth: number;
		usedHeight: number;
	};

	type Point = {
		x: number;
		y: number;
	};

	type ConnectionLine = {
		key: string;
		sourceKey: string;
		targetKey: string;
		start: Point;
		end: Point;
		active: boolean;
	};

	type CanvasCover = {
		key: string;
		edition: Edition;
		element: string;
	};

	type CoverSize = {
		key: string;
		width: number;
		height: number;
	};

	let host = $state<HTMLElement | null>(null);
	let placements = $state<Placement[]>([]);
	let hoveredIndex = $state<number | null>(null);
	let pointer = $state<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
	let viewport = $state<{ width: number; height: number }>({ width: 0, height: 0 });
	let cameraOffset = $state<Point>({ x: 0, y: 0 });
	let cameraTarget = $state<Point>({ x: 0, y: 0 });
	let mobileRotations = $state<number[]>([]);
	let connectionLines = $state<ConnectionLine[]>([]);
	let areConnectionLinesVisible = $state(false);
	let hoveredCoverKey = $state<string | null>(null);
	let hoveredEditionName = $state<string | null>(null);

	const coverElements = new Map<string, HTMLButtonElement>();
	let connectionRefreshFrame: number | null = null;
	let cameraAnimationFrame: number | null = null;
	let hoverTimeout: number | null = null;

	const scenePadding = 100;
	const mobileRotationMin = -6;
	const mobileRotationMax = 6;
	const pointerInfluenceRadius = 1200;
	const pointerMaxShift = 400;
	const dimmedCoverOpacity = 0.18;
	const cameraEase = 0.12;
	const cameraSnapThreshold = 0.2;
	const cameraDragStrength = 0.9;
	const stitchPointSpread = 2.5;
	const stitchPointRatios: Point[] = [
		{ x: 0.5, y: 0.5 },
		{ x: 0.57, y: 0.48 },
		{ x: 0.46, y: 0.56 },
		{ x: 0.42, y: 0.46 },
		{ x: 0.61, y: 0.55 },
		{ x: 0.53, y: 0.4 },
		{ x: 0.38, y: 0.54 },
		{ x: 0.48, y: 0.63 },
		{ x: 0.66, y: 0.47 },
		{ x: 0.58, y: 0.62 },
		{ x: 0.35, y: 0.45 },
		{ x: 0.44, y: 0.36 },
		{ x: 0.63, y: 0.39 },
		{ x: 0.31, y: 0.56 },
		{ x: 0.53, y: 0.69 },
		{ x: 0.69, y: 0.58 },
		{ x: 0.4, y: 0.67 },
		{ x: 0.29, y: 0.39 },
		{ x: 0.6, y: 0.31 },
		{ x: 0.74, y: 0.46 },
		{ x: 0.47, y: 0.29 },
		{ x: 0.26, y: 0.5 },
		{ x: 0.68, y: 0.67 },
		{ x: 0.37, y: 0.29 },
		{ x: 0.55, y: 0.77 },
		{ x: 0.77, y: 0.56 },
		{ x: 0.25, y: 0.63 },
		{ x: 0.33, y: 0.73 },
		{ x: 0.7, y: 0.3 },
		{ x: 0.18, y: 0.46 },
		{ x: 0.5, y: 0.2 },
		{ x: 0.82, y: 0.42 },
		{ x: 0.64, y: 0.8 },
		{ x: 0.22, y: 0.34 },
		{ x: 0.42, y: 0.82 },
		{ x: 0.8, y: 0.68 }
	];
	const stitchRotations = [-3.2, -1.8, -0.9, 0.6, 1.7, 2.9, -2.5, 0.2, 1.1, -1.2, 2.1, -3.6];

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function randomBetween(min: number, max: number) {
		return min + Math.random() * (max - min);
	}

	function getSquareSpiralOffset(index: number): Point {
		if (index <= 0) return { x: 0, y: 0 };

		let x = 0;
		let y = 0;
		let visited = 0;
		let stepLength = 1;
		let directionIndex = 0;
		const directions: Point[] = [
			{ x: 1, y: 0 },
			{ x: 0, y: 1 },
			{ x: -1, y: 0 },
			{ x: 0, y: -1 }
		];

		while (visited < index) {
			for (let repeat = 0; repeat < 2; repeat += 1) {
				const direction = directions[directionIndex % directions.length];
				for (let step = 0; step < stepLength; step += 1) {
					x += direction.x;
					y += direction.y;
					visited += 1;
					if (visited === index) {
						return { x, y };
					}
				}
				directionIndex += 1;
			}
			stepLength += 1;
		}

		return { x, y };
	}

	function createPlacements(
		sceneWidth: number,
		sceneHeight: number,
		coverSizes: CoverSize[]
	): PlacementResult {
		const count = coverSizes.length;
		if (count === 0) {
			return {
				placements: [],
				usedWidth: sceneWidth,
				usedHeight: sceneHeight
			};
		}

		const placements: Placement[] = Array.from({ length: count });
		const stitchCanvasWidth = Math.max(sceneWidth * 1.7, 1500);
		const stitchCanvasHeight = Math.max(sceneHeight * 1.7, 1500);
		const overflowSquareStep = Math.max(
			Math.min(stitchCanvasWidth, stitchCanvasHeight) * 0.12,
			180
		);
		let minXUsed = Number.POSITIVE_INFINITY;
		let minYUsed = Number.POSITIVE_INFINITY;
		let maxXUsed = scenePadding;
		let maxYUsed = scenePadding;

		for (let index = 0; index < count; index += 1) {
			const size = coverSizes[index];
			const stitchIndex = index % stitchPointRatios.length;
			const loopIndex = Math.floor(index / stitchPointRatios.length);
			const stitchPoint = stitchPointRatios[stitchIndex];
			const spreadPoint = {
				x: clamp(0.5 + (stitchPoint.x - 0.5) * stitchPointSpread, 0.06, 0.94),
				y: clamp(0.5 + (stitchPoint.y - 0.5) * stitchPointSpread, 0.06, 0.94)
			};
			const squareSpiralOffset = getSquareSpiralOffset(loopIndex);
			const anchorX =
				scenePadding +
				spreadPoint.x * stitchCanvasWidth +
				squareSpiralOffset.x * overflowSquareStep;
			const anchorY =
				scenePadding +
				spreadPoint.y * stitchCanvasHeight +
				squareSpiralOffset.y * overflowSquareStep;
			const x = anchorX - size.width / 2;
			const y = anchorY - size.height / 2;

			placements[index] = {
				x,
				y,
				width: size.width,
				height: size.height,
				rotate: stitchRotations[index % stitchRotations.length]
			};
			minXUsed = Math.min(minXUsed, x);
			minYUsed = Math.min(minYUsed, y);
			maxXUsed = Math.max(maxXUsed, x + size.width);
			maxYUsed = Math.max(maxYUsed, y + size.height);
		}

		const rawWidth = maxXUsed - minXUsed;
		const rawHeight = maxYUsed - minYUsed;
		const usedWidth = Math.max(sceneWidth * 1.45, rawWidth + scenePadding * 2);
		const usedHeight = Math.max(sceneHeight * 1.45, rawHeight + scenePadding * 2);
		const cloudCenterX = (minXUsed + maxXUsed) / 2;
		const cloudCenterY = (minYUsed + maxYUsed) / 2;
		const shiftX = usedWidth / 2 - cloudCenterX;
		const shiftY = usedHeight / 2 - cloudCenterY;
		const centeredPlacements = placements.map((placement) => ({
			...placement,
			x: placement.x + shiftX,
			y: placement.y + shiftY
		}));

		return {
			placements: centeredPlacements,
			usedWidth,
			usedHeight
		};
	}

	function buildConnectionLinePool(): ConnectionLine[] {
		const keysByEdition = new Map<string, string[]>();
		canvasCovers.forEach((cover) => {
			const keys = keysByEdition.get(cover.edition.name);
			if (keys) {
				keys.push(cover.key);
				return;
			}
			keysByEdition.set(cover.edition.name, [cover.key]);
		});

		return canvasCovers.flatMap((cover) => {
			const relatedKeys = (keysByEdition.get(cover.edition.name) ?? []).filter(
				(key) => key !== cover.key
			);
			return relatedKeys.map((relatedKey) => ({
				key: `${cover.key}-${relatedKey}`,
				sourceKey: cover.key,
				targetKey: relatedKey,
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
				active: false
			}));
		});
	}

	async function waitForCoverImages() {
		const imagePromises = canvasCovers.map((cover) => {
			const coverElement = coverElements.get(cover.key);
			const imageElement = coverElement?.querySelector('img');
			if (!imageElement) return Promise.resolve();
			if (imageElement.complete) return Promise.resolve();
			return new Promise<void>((resolve) => {
				const finish = () => resolve();
				imageElement.addEventListener('load', finish, { once: true });
				imageElement.addEventListener('error', finish, { once: true });
			});
		});

		await Promise.all(imagePromises);
	}

	function getCoverSizes(): CoverSize[] {
		const measured = canvasCovers
			.map((cover) => {
				const coverElement = coverElements.get(cover.key);
				if (!coverElement) return null;
				const coverRect = coverElement.getBoundingClientRect();
				if (coverRect.width <= 0 || coverRect.height <= 0) return null;
				return {
					key: cover.key,
					width: coverRect.width,
					height: coverRect.height
				};
			})
			.filter((coverSize): coverSize is CoverSize => coverSize !== null);

		if (measured.length === 0) return [];
		const averageWidth =
			measured.reduce((sum, coverSize) => sum + coverSize.width, 0) / measured.length;
		const averageHeight =
			measured.reduce((sum, coverSize) => sum + coverSize.height, 0) / measured.length;
		const measuredByKey = new Map(measured.map((coverSize) => [coverSize.key, coverSize]));

		return canvasCovers.map((cover) => {
			const coverSize = measuredByKey.get(cover.key);
			return (
				coverSize ?? {
					key: cover.key,
					width: averageWidth,
					height: averageHeight
				}
			);
		});
	}

	async function initializeScene() {
		if (!host || typeof window === 'undefined') return;
		connectionLines = buildConnectionLinePool();
		areConnectionLinesVisible = false;

		if (window.matchMedia('(min-width: 768px)').matches) {
			await waitForCoverImages();
			if (!host) return;
			const rect = host.getBoundingClientRect();
			const sizes = getCoverSizes();
			const {
				placements: computed,
				usedWidth,
				usedHeight
			} = createPlacements(rect.width, rect.height, sizes);
			placements = computed;
			viewport = {
				width: Math.max(rect.width, usedWidth),
				height: Math.max(rect.height, usedHeight)
			};
		} else {
			const rect = host.getBoundingClientRect();
			viewport = { width: rect.width, height: rect.height };
			placements = [];
		}
		setCameraTarget(getCameraHomeTarget(), true);

		mobileRotations = editions.map(() => randomBetween(mobileRotationMin, mobileRotationMax));
	}

	function getCameraBounds() {
		if (!host) return null;
		const hostRect = host.getBoundingClientRect();
		return {
			minX: Math.min(0, hostRect.width - viewport.width),
			maxX: 0,
			minY: Math.min(0, hostRect.height - viewport.height),
			maxY: 0,
			hostWidth: hostRect.width,
			hostHeight: hostRect.height
		};
	}

	function clampCameraOffset(offset: Point): Point {
		const bounds = getCameraBounds();
		if (!bounds) return offset;
		return {
			x: clamp(offset.x, bounds.minX, bounds.maxX),
			y: clamp(offset.y, bounds.minY, bounds.maxY)
		};
	}

	function getCameraHomeTarget() {
		const bounds = getCameraBounds();
		if (!bounds) return { x: 0, y: 0 };
		return {
			x: (bounds.hostWidth - viewport.width) / 2,
			y: (bounds.hostHeight - viewport.height) / 2
		};
	}

	function getCameraOffsetFromCenter() {
		const home = getCameraHomeTarget();
		return {
			x: cameraOffset.x - home.x,
			y: cameraOffset.y - home.y
		};
	}

	function getSubtleSkew(index: number): Point {
		const bounds = getCameraBounds();
		if (!bounds) return { x: 0, y: 0 };

		const centeredOffset = getCameraOffsetFromCenter();
		const maxTravelX = Math.max(1, (viewport.width - bounds.hostWidth) / 2);
		const maxTravelY = Math.max(1, (viewport.height - bounds.hostHeight) / 2);
		const cameraRatioX = clamp(centeredOffset.x / maxTravelX, -1, 1);
		const cameraRatioY = clamp(centeredOffset.y / maxTravelY, -1, 1);
		const indexBiasX = ((index % 7) - 3) * 0.05;
		const indexBiasY = ((Math.floor(index / 2) % 7) - 3) * 0.04;

		return {
			x: clamp(cameraRatioX * 0.35 + indexBiasX, -0.6, 0.6),
			y: clamp(cameraRatioY * 0.3 + indexBiasY, -0.6, 0.6)
		};
	}

	function runCameraAnimation() {
		if (typeof window === 'undefined') return;
		if (cameraAnimationFrame !== null) return;

		const step = () => {
			const dx = cameraTarget.x - cameraOffset.x;
			const dy = cameraTarget.y - cameraOffset.y;

			if (Math.abs(dx) <= cameraSnapThreshold && Math.abs(dy) <= cameraSnapThreshold) {
				cameraOffset = cameraTarget;
				cameraAnimationFrame = null;
				scheduleConnectionLinesRefresh();
				return;
			}

			cameraOffset = clampCameraOffset({
				x: cameraOffset.x + dx * cameraEase,
				y: cameraOffset.y + dy * cameraEase
			});
			scheduleConnectionLinesRefresh();
			cameraAnimationFrame = window.requestAnimationFrame(step);
		};

		cameraAnimationFrame = window.requestAnimationFrame(step);
	}

	function setCameraTarget(target: Point, immediate = false) {
		const clampedTarget = clampCameraOffset(target);
		cameraTarget = clampedTarget;
		if (immediate) {
			cameraOffset = clampedTarget;
			scheduleConnectionLinesRefresh();
			return;
		}
		runCameraAnimation();
	}

	function updateCameraTargetFromInput() {
		const bounds = getCameraBounds();
		if (!bounds) return;
		if (!pointer.active) {
			setCameraTarget(getCameraHomeTarget());
			return;
		}

		const normalizedX = bounds.hostWidth > 0 ? pointer.x / bounds.hostWidth - 0.5 : 0;
		const normalizedY = bounds.hostHeight > 0 ? pointer.y / bounds.hostHeight - 0.5 : 0;
		const maxTravelX = Math.max(0, (viewport.width - bounds.hostWidth) / 2);
		const maxTravelY = Math.max(0, (viewport.height - bounds.hostHeight) / 2);
		const home = getCameraHomeTarget();
		const target: Point = {
			x: home.x - normalizedX * 2 * maxTravelX * cameraDragStrength,
			y: home.y - normalizedY * 2 * maxTravelY * cameraDragStrength
		};

		setCameraTarget(target);
	}

	function getCoverRectInHost(coverKey: string): DOMRect | null {
		if (!host) return null;
		const coverElement = coverElements.get(coverKey);
		if (!coverElement) return null;
		const hostRect = host.getBoundingClientRect();
		const coverRect = coverElement.getBoundingClientRect();
		return new DOMRect(
			coverRect.left - hostRect.left,
			coverRect.top - hostRect.top,
			coverRect.width,
			coverRect.height
		);
	}

	function getPointerTranslationForPlacement(coverKey: string, placement: Placement): Point {
		if (!pointer.active) return { x: 0, y: 0 };
		if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
			return { x: 0, y: 0 };
		}

		const coverRect = getCoverRectInHost(coverKey);
		const left = coverRect?.x ?? placement.x;
		const top = coverRect?.y ?? placement.y;
		const width = coverRect?.width ?? placement.width;
		const height = coverRect?.height ?? placement.height;

		const pointerInsidePlacement =
			pointer.x >= left &&
			pointer.x <= left + width &&
			pointer.y >= top &&
			pointer.y <= top + height;
		if (pointerInsidePlacement) {
			return { x: 0, y: 0 };
		}

		const centerX = left + width / 2;
		const centerY = top + height / 2;
		const dx = centerX - pointer.x;
		const dy = centerY - pointer.y;
		const distance = Math.hypot(dx, dy);

		if (distance < 0.0001) {
			return { x: 0, y: 0 };
		}

		const strength = clamp(distance / pointerInfluenceRadius, 0, 1);
		const magnitude = pointerMaxShift * strength;

		return {
			x: (dx / distance) * magnitude,
			y: (dy / distance) * magnitude
		};
	}

	function handleWindowPointerMove(e: PointerEvent) {
		if (!host) return;
		const rect = host.getBoundingClientRect();
		pointer = {
			x: clamp(e.clientX - rect.left, 0, rect.width),
			y: clamp(e.clientY - rect.top, 0, rect.height),
			active: true
		};
		if (window.matchMedia('(min-width: 768px)').matches) {
			updateCameraTargetFromInput();
		}
		scheduleConnectionLinesRefresh();
	}

	function handleWindowBlur() {
		resetMouse();
	}

	function resetMouse() {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		pointer = { x: 0, y: 0, active: false };
		hoveredIndex = null;
		hoveredCoverKey = null;
		hoveredEditionName = null;
		if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
			updateCameraTargetFromInput();
		} else {
			setCameraTarget({ x: 0, y: 0 }, true);
		}
		areConnectionLinesVisible = false;
		connectionLines = connectionLines.map((line) =>
			line.active
				? {
						...line,
						active: false
					}
				: line
		);
		isTitleShowing.set(false);
		currentEdition.set(null);
	}

	function handleCoverPointerEnter(coverIndex: number, coverKey: string, edition: Edition) {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
		hoverTimeout = window.setTimeout(() => {
			hoveredIndex = coverIndex;
			hoveredCoverKey = coverKey;
			hoveredEditionName = edition.name;
			if (window.matchMedia('(min-width: 768px)').matches) {
				updateCameraTargetFromInput();
			}
			currentEdition.set(edition);
			refreshConnectionLines();
			isTitleShowing.set(true);
			hoverTimeout = null;
		}, 150);
	}

	let isReady = $state(false);

	function markReady() {
		requestAnimationFrame(() => {
			isReady = true;
		});
	}

	function getPlacementCoords(index: number) {
		const placement = placements[index];
		const cover = canvasCovers[index];

		if (!placement || !cover) return null;

		const translation = getPointerTranslationForPlacement(cover.key, placement);
		const skew = getSubtleSkew(index);
		const isHovered = hoveredIndex === index;
		const zIndex = isHovered ? 50 : 10 + (index % 12);
		let opacity = 1;
		if (hoveredEditionName) {
			if (cover.edition.name !== hoveredEditionName) {
				opacity = dimmedCoverOpacity;
			}
		}

		return {
			x: placement.x,
			y: placement.y,
			tx: translation.x,
			ty: translation.y,
			skewX: skew.x,
			skewY: skew.y,
			width: placement.width,
			zIndex,
			rotate: placement.rotate,
			opacity
		};
	}

	function getCoverCentersForKeys(coverKeys: string[]): Map<string, Point> {
		const centers = new Map<string, Point>();
		if (placements.length === 0) return centers;
		const indexByCoverKey = new Map(canvasCovers.map((cover, index) => [cover.key, index]));

		coverKeys.forEach((coverKey) => {
			const coverIndex = indexByCoverKey.get(coverKey);
			if (coverIndex === undefined) return;
			const placement = placements[coverIndex];
			if (!placement) return;
			const translation = getPointerTranslationForPlacement(coverKey, placement);
			centers.set(coverKey, {
				x: placement.x + placement.width / 2 + translation.x,
				y: placement.y + placement.height / 2 + translation.y
			});
		});

		return centers;
	}

	function getRelatedCoverKeys(coverKey: string): string[] {
		const sourceCover = canvasCovers.find((cover) => cover.key === coverKey);
		if (!sourceCover) return [];

		return canvasCovers
			.filter((cover) => cover.key !== coverKey && cover.edition.name === sourceCover.edition.name)
			.map((cover) => cover.key);
	}

	function refreshConnectionLines() {
		if (!hoveredCoverKey || !hoveredEditionName) return;

		const relatedKeys = getRelatedCoverKeys(hoveredCoverKey);
		const centers = getCoverCentersForKeys([hoveredCoverKey, ...relatedKeys]);
		const sourceCenter = centers.get(hoveredCoverKey);
		const activeKeys = new Set(relatedKeys.map((relatedKey) => `${hoveredCoverKey}-${relatedKey}`));
		let hasVisibleLines = false;

		connectionLines = connectionLines.map((line) => {
			if (!sourceCenter || !activeKeys.has(line.key)) {
				if (!line.active) return line;
				return {
					...line,
					active: false
				};
			}

			const targetCenter = centers.get(line.targetKey);
			if (!targetCenter) {
				if (!line.active) return line;
				return {
					...line,
					active: false
				};
			}

			hasVisibleLines = true;
			return {
				...line,
				start: sourceCenter,
				end: targetCenter,
				active: true
			};
		});

		areConnectionLinesVisible = hasVisibleLines;
	}

	function scheduleConnectionLinesRefresh() {
		if (typeof window === 'undefined') return;
		if (!hoveredCoverKey || !hoveredEditionName) return;
		if (connectionRefreshFrame !== null) return;

		connectionRefreshFrame = window.requestAnimationFrame(() => {
			refreshConnectionLines();
			connectionRefreshFrame = null;
		});
	}

	function registerCoverElement(node: HTMLButtonElement, coverKey: string) {
		coverElements.set(coverKey, node);
		return {
			destroy() {
				if (coverElements.get(coverKey) === node) {
					coverElements.delete(coverKey);
				}
			}
		};
	}

	onMount(() => {
		if (!host || typeof window === 'undefined') return;

		let isDisposed = false;
		void (async () => {
			await initializeScene();
			if (!isDisposed) {
				markReady();
			}
		})();

		return () => {
			isDisposed = true;
			if (connectionRefreshFrame !== null) {
				window.cancelAnimationFrame(connectionRefreshFrame);
			}
			if (cameraAnimationFrame !== null) {
				window.cancelAnimationFrame(cameraAnimationFrame);
			}
			resetMouse();
		};
	});
</script>

<svelte:head>
	{#each editions as edition}
		{@const coverImages = getEditionElements(edition.name)}
		{#if coverImages.length > 0}
			{#each coverImages as image}
				<link rel="preload" as="image" href={image} fetchpriority="high" />
			{/each}
		{/if}
	{/each}
</svelte:head>

<svelte:window onpointermove={handleWindowPointerMove} onblur={handleWindowBlur} />

<section
	bind:this={host}
	class="group/canvas relative top-12 flex w-full flex-col items-center justify-center gap-20 overflow-y-scroll py-24 transition-opacity duration-500 md:top-0 md:h-dvh md:h-screen md:w-screen md:gap-0 md:overflow-hidden md:py-0"
	class:opacity-0={!isReady}
	class:pointer-events-none={!isReady}
>
	<div
		class="absolute top-0 left-0 z-0 hidden will-change-transform md:block"
		style="width: {viewport.width}px; height: {viewport.height}px; transform: translate3d({cameraOffset.x}px, {cameraOffset.y}px, 0);"
	>
		{#if connectionLines.length > 0}
			<svg
				class="pointer-events-none absolute inset-0 z-[-5] h-full w-full"
				width={viewport.width}
				height={viewport.height}
				aria-hidden="true"
			>
				{#each connectionLines as line (line.key)}
					{#if areConnectionLinesVisible && line.active}
						<line
							x1={line.start.x}
							y1={line.start.y}
							x2={line.end.x}
							y2={line.end.y}
							stroke="white"
							stroke-width="10"
							stroke-linecap="round"
							transition:draw={{ duration: 900, easing: quadIn }}
						/>
					{/if}
				{/each}
			</svg>
		{/if}
		{#each canvasCovers as cover, index (cover.key)}
			{@const placementStyle = getPlacementCoords(index)}
			<button
				type="button"
				data-hover={cover.key.replace(' ', '').split('/').pop()}
				use:registerCoverElement={cover.key}
				onclick={() => openPanel(cover.edition)}
				onpointerenter={() => handleCoverPointerEnter(index, cover.key, cover.edition)}
				onpointerleave={() => resetMouse()}
				class="canvas-cover transition-[opacity,drop-shadow,transform, scale] absolute h-75 w-fit origin-center cursor-pointer overflow-clip rounded-md opacity-0 duration-250 ease-out hover:scale-105 hover:drop-shadow-sm focus-visible:opacity-100!"
				style="left: {placementStyle ? placementStyle.x : 0}px; top: {placementStyle
					? placementStyle.y
					: 0}px; transform: translate({placementStyle ? placementStyle.tx : 0}px, {placementStyle
					? placementStyle.ty
					: 0}px) rotate({placementStyle ? placementStyle.rotate : 0}deg) skewX({placementStyle
					? placementStyle.skewX
					: 0}deg) skewY({placementStyle ? placementStyle.skewY : 0}deg); opacity: {placementStyle
					? placementStyle.opacity
					: 0};"
				aria-label={cover.edition.name}
			>
				<img
					src={cover.element}
					alt={cover.edition.name}
					class="block h-full w-auto max-w-none overflow-clip object-contain"
					loading="eager"
					fetchpriority="high"
					decoding="async"
				/>
			</button>
		{/each}
	</div>
	{#each editions as edition, index}
		{@const editionElements = getEditionElements(edition.name)}
		<!-- mobile version -->
		<button
			class="block h-auto w-[80%] rounded-md drop-shadow-sm md:hidden"
			type="button"
			aria-label={edition.name}
			onclick={() => openPanel(edition)}
			style={`transform: rotate(${mobileRotations[index] ?? 0}deg);`}
		>
			<img
				src={editionElements.find((e) => e.toLowerCase().includes('cover')) ?? editionElements[0]}
				alt={edition.name}
				class="h-auto w-full object-contain"
			/>
		</button>
	{/each}
	{#if $isTitleShowing}
		<div
			class="pointer-events-none absolute z-10 flex h-dvh h-screen w-screen items-center justify-center"
		>
			<h1
				in:fly={{ y: 50, duration: 300, easing: cubicInOut, delay: 200 }}
				out:fly={{ y: 50, duration: 300, easing: cubicInOut, delay: 0 }}
				class="bg-neutral-100 p-2 text-6xl"
			>
				{$currentEdition?.name}
			</h1>
		</div>
	{/if}
	<div
		class="h-scree absolute top-0 left-0 -z-10 hidden h-dvh w-dvw w-screen bg-transparent md:block"
		onpointerenter={() => resetMouse()}
	></div>
</section>
<Gradient></Gradient>
