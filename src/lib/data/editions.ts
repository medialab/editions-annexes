import type { Edition } from '$lib/types';
import { editions } from './datasource';

export function isEditionActive(edition: Edition): boolean {
	return edition.pdfStatus === 'active' && Boolean(edition.downloadHref);
}

export const activeEditions = editions.filter(isEditionActive);
