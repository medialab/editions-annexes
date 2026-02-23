import { writable } from 'svelte/store';
import type { Edition, MenuVariations } from './types';
import { editions } from './data/datasource';
import { goto } from '$app/navigation';
import { asset, resolve } from '$app/paths';

export const currentEdition = writable<Edition | null>(editions[0]);
export const isMobile = writable(false);
export const currentPanel = writable<MenuVariations | null>('book');
export const allEditions = writable<Edition[]>(editions);
export let isFooterOpen = writable(false);
export const hideFooter = writable(true);
export const isFooterHovered = writable(false);
export const isTitleShowing = writable(false);
export const isCoverDragging = writable(false);
export const DND_SOURCE_CONTAINER = 'canvas';
export const DND_FOOTER_CONTAINER = 'footer-dropzone';
export const isAboutOpen = writable(false);
export const currentReaderPage = writable<number>(1);
export const restCursorText = writable('<b>Editiones Annexes</b> is always looking for publications, click to get our email!')

//Media management

const canvasElementModules = import.meta.glob<string>('$lib/media/editions/**/canvasElements/*.{jpg,jpeg,png}', {
	eager: true,
	import: 'default'
});

const pageModules = import.meta.glob<string>('$lib/media/editions/**/pages/page-*.{jpg,jpeg,png}', {
	eager: true,
	import: 'default'
});

const galleryModules = import.meta.glob<string>(
	'$lib/media/editions/**/images/*.{jpg,jpeg,png,svg}',
	{
		eager: true,
		import: 'default'
	}
);

export function toAssetHref(pathname?: string) {
	if (!pathname) return undefined;
	return asset(pathname.startsWith('/') ? pathname : `/${pathname}`);
}

function ensurePdfFilename(value?: string | null): string | undefined {
	const normalized = value?.trim();
	if (!normalized) return undefined;
	return normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized}.pdf`;
}

function filenameFromPath(pathname?: string | null): string | undefined {
	if (!pathname) return undefined;
	const normalized = pathname.split('/').pop();
	return ensurePdfFilename(normalized);
}

export function getEditionDownloadInfo(edition?: Pick<Edition, 'downloadHref' | 'name'> | null): {
	href?: string;
	filename?: string;
} {
	const href = toAssetHref(edition?.downloadHref);
	if (!href) return {};

	const filename = ensurePdfFilename(edition?.name) ?? filenameFromPath(edition?.downloadHref);
	return { href, filename };
}

function normalizeEditionKey(value?: string | null): string {
	if (!value) return '';

	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function getEditionFromAssetKey(key: string): string {
	const match = key.match(/\/editions\/([^/]+)\//);
	return normalizeEditionKey(match?.[1]);
}

function pushAsset(index: Record<string, string[]>, edition: string, url: string) {
	if (!edition) return;
	if (!index[edition]) {
		index[edition] = [];
	}
	index[edition].push(url);
}

const editionCanvasElementIndex: Record<string, string[]> = {};
for (const [key, url] of Object.entries(canvasElementModules).sort(([keyA], [keyB]) =>
	keyA.localeCompare(keyB)
)) {
	pushAsset(editionCanvasElementIndex, getEditionFromAssetKey(key), url);
}

const editionPagesIndex: Record<string, string[]> = {};
const editionGalleryIndex: Record<string, string[]> = {};

const pageEntries: Record<string, Array<{ page: number; url: string }>> = {};
for (const [key, url] of Object.entries(pageModules)) {
	const edition = getEditionFromAssetKey(key);
	if (!edition) continue;

	const file = key.split('/').pop()?.toLowerCase() ?? '';
	const pageMatch = file.match(/^page-(\d+)\.(jpg|jpeg|png)$/);
	if (!pageMatch) continue;

	if (!pageEntries[edition]) {
		pageEntries[edition] = [];
	}
	pageEntries[edition].push({ page: Number(pageMatch[1]), url });
}

for (const [edition, items] of Object.entries(pageEntries)) {
	editionPagesIndex[edition] = items.sort((a, b) => a.page - b.page).map((item) => item.url);
}

for (const [key, url] of Object.entries(galleryModules).sort(([keyA], [keyB]) =>
	keyA.localeCompare(keyB)
)) {
	pushAsset(editionGalleryIndex, getEditionFromAssetKey(key), url);
}

export function getEditionElements(editionName?: string | null): string[] {
	const normalizedName = normalizeEditionKey(editionName);
	return editionCanvasElementIndex[normalizedName] ?? [];
}

export async function getEditionPages(editionName?: string | null): Promise<string[]> {
	const normalizedName = normalizeEditionKey(editionName);
	return editionPagesIndex[normalizedName] ?? [];
}

export async function getEditionGalleryImages(editionName?: string | null): Promise<string[]> {
	const normalizedName = normalizeEditionKey(editionName);
	return editionGalleryIndex[normalizedName] ?? [];
}

export function openPanel(edition: Edition) {
	//console.log('edition dropped:', edition);
	currentReaderPage.set(0);
	currentPanel.set('book');
	isFooterOpen.set(false);
	goto(resolve(`/editions/${edition.name}`));
	currentEdition.set(edition);
}

export const copyText = (t: string) => {
	navigator.clipboard.writeText(t);
	restCursorText.set(`<span style="color: #2E8B57"><b>${t}</b></span> copied <span style="color: #2E8B57"><b>✓</b></span>`);
	setTimeout(() => {
		restCursorText.set(
			'<b>Editiones Annexes</b> is always looking for publications, click to get our email!'
		);
	}, 1200);
};
