export function isExternalHref(url?: string | null): boolean {
	if (!url) return false;
	return /^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:');
}

export function preventDefault(event: Event): void {
	event.preventDefault();
}

export async function webShareApi(
	title: string,
	url: string,
	subtitle?: string,
	imageUrl?: string
): Promise<void> {
	if (!title || !url) {
		console.warn('Cannot share: missing title or URL');
		return;
	}

	let shareData: ShareData;

	if (imageUrl) {
		const response = await fetch(imageUrl);
		const blob = await response.blob();
		const file = new File([blob], 'thumb.png', {
			type: blob.type,
			lastModified: new Date().getTime()
		});

		shareData = {
			title: `${title} - ${subtitle}`,
			text: `\n\n${title} - ${subtitle}\n\nPart of éditions annexes\n\n${url}`,
			url,
			files: [file]
		};
	} else {
		shareData = {
			title: `${title} - Annex of ${subtitle}`,
			text: `\n\n${title} - Annex of ${subtitle}\n\nPart of éditions annexes\n\n${url}`,
			url
		};
	}

	if (navigator.share) {
		try {
			await navigator.share(shareData);
		} catch (err) {
			if (err instanceof Error && err.name !== 'AbortError') {
				console.error('Error sharing:', err);
			}
		}
	} else {
		console.warn('Web Share API not supported on this browser');
	}
}

export function hasValue(value?: string | null): boolean {
	return Boolean(value && value.trim().length > 0);
}
