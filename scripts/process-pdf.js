import { execFileSync } from 'child_process';
import { createHash, randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const DEFAULT_PDF_SOURCE_DIR = 'static/pdfs';
const DEFAULT_IMAGE_OUTPUT_DIR = 'src/lib/media/editions';
const DEFAULT_DATASOURCE_PATH = 'src/lib/data/datasource.ts';

export const PDF_STATUS_ACTIVE = 'active';
export const PDF_STATUS_ARCHIVED = 'archived-old-version';

function slugify(text) {
	return text
		.toString()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w\.-]+/g, '')
		.replace(/\-\-+/g, '-');
}

function normalizeWhitespace(value) {
	return (value || '').replace(/\s+/g, ' ').trim();
}

function decodeXmlEntities(value) {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function unique(values) {
	return [...new Set(values.filter(Boolean))];
}

function splitPeopleList(value) {
	const normalized = normalizeWhitespace(value).replace(/\s+(?:and|&)\s+/gi, ',');
	return unique(
		normalized
			.split(/[,;|]/)
			.map((part) => normalizeWhitespace(part))
			.filter(Boolean)
	);
}

function splitKeywords(value) {
	return unique(
		normalizeWhitespace(value)
			.split(/[,;|]/)
			.map((part) => normalizeWhitespace(part))
			.filter(Boolean)
	);
}

function extractIsbn(value) {
	const input = normalizeWhitespace(value);
	if (!input) return '';

	const candidates = input.match(/(?:97[89][-\s]?)?(?:\d[-\s]?){9,16}\d/g) || [];
	for (const candidate of candidates) {
		const digits = candidate.replace(/\D/g, '');
		if (digits.length === 10 || digits.length === 13) {
			return normalizeWhitespace(candidate);
		}
	}

	return '';
}

function extractXmlValues(xml, localName) {
	const pattern = new RegExp(
		`<(?:\\w+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${localName}>`,
		'gi'
	);
	const values = [];
	let match;

	while ((match = pattern.exec(xml)) !== null) {
		const inner = match[1];
		const liMatches = [...inner.matchAll(/<(?:\w+:)?li(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?li>/gi)];

		if (liMatches.length > 0) {
			liMatches.forEach((liMatch) => {
				const cleaned = normalizeWhitespace(decodeXmlEntities(liMatch[1].replace(/<[^>]+>/g, '')));
				if (cleaned) values.push(cleaned);
			});
			continue;
		}

		const cleaned = normalizeWhitespace(decodeXmlEntities(inner.replace(/<[^>]+>/g, '')));
		if (cleaned) values.push(cleaned);
	}

	return unique(values);
}

function parseXmpMetadata(xmpXml) {
	if (!xmpXml || !xmpXml.includes('<')) return {};

	const title = extractXmlValues(xmpXml, 'title')[0] || '';
	const description = extractXmlValues(xmpXml, 'description')[0] || '';
	const creators = extractXmlValues(xmpXml, 'creator');
	const contributors = extractXmlValues(xmpXml, 'contributor');
	const publishers = extractXmlValues(xmpXml, 'publisher');
	const keywords = unique([
		...extractXmlValues(xmpXml, 'Keywords'),
		...extractXmlValues(xmpXml, 'subject')
	]);
	const identifiers = extractXmlValues(xmpXml, 'identifier');
	const createDate = extractXmlValues(xmpXml, 'CreateDate')[0] || '';
	const isbn = extractIsbn([...identifiers, title, description].join(' '));

	return {
		Title: title,
		Subject: description,
		Author: creators.join(', '),
		Contributor: contributors.join(', '),
		Publisher: publishers[0] || '',
		Keywords: keywords.join(', '),
		Identifier: identifiers.join(', '),
		CreationDate: createDate,
		ISBN: isbn
	};
}

function applyFallbackMetadata(target, source) {
	Object.entries(source).forEach(([key, value]) => {
		if (!target[key] && value) {
			target[key] = value;
		}
	});
}

export function getPdfMetadata(pdfPath) {
	const metadata = {};
	let hasPdfInfo = false;

	try {
		const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
		hasPdfInfo = true;
		info.split('\n').forEach((line) => {
			const [key, ...valueParts] = line.split(':');
			if (key && valueParts.length > 0) {
				metadata[key.trim()] = valueParts.join(':').trim();
			}
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(`Could not extract metadata for ${pdfPath}: ${message}`);
	}

	if (!hasPdfInfo) {
		return {};
	}

	try {
		const xmpRaw = execFileSync('pdfinfo', ['-meta', pdfPath], { encoding: 'utf8' });
		const xmpMetadata = parseXmpMetadata(xmpRaw);
		applyFallbackMetadata(metadata, xmpMetadata);
	} catch {
		// XMP metadata is optional.
	}

	return metadata;
}

function formatPublishingDate(rawDate) {
	const input = normalizeWhitespace(rawDate);
	if (!input) return '';

	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];
	const shortToFull = {
		jan: 'January',
		feb: 'February',
		mar: 'March',
		apr: 'April',
		may: 'May',
		jun: 'June',
		jul: 'July',
		aug: 'August',
		sep: 'September',
		oct: 'October',
		nov: 'November',
		dec: 'December'
	};

	const pdfDateMatch = input.match(/^D:(\d{4})(\d{2})?/i);
	if (pdfDateMatch) {
		const year = pdfDateMatch[1];
		const monthNumber = Number(pdfDateMatch[2] || 0);
		if (monthNumber >= 1 && monthNumber <= 12) {
			return `${monthNames[monthNumber - 1]} ${year}`;
		}
		return year;
	}

	const monthYearMatch = input.match(
		/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b[\s,]+(\d{4})/i
	);
	if (monthYearMatch) {
		const month = monthYearMatch[1].toLowerCase();
		const year = monthYearMatch[2];
		return `${shortToFull[month] || monthNames.find((m) => m.toLowerCase() === month)} ${year}`;
	}

	const yearMatch = input.match(/\b(19|20)\d{2}\b/);
	if (yearMatch) return yearMatch[0];

	return input;
}

function ensureDirectory(directoryPath) {
	if (!fs.existsSync(directoryPath)) {
		fs.mkdirSync(directoryPath, { recursive: true });
	}
}

function clearGeneratedPages(targetDir) {
	if (!fs.existsSync(targetDir)) return;

	const files = fs.readdirSync(targetDir);
	files.forEach((file) => {
		if (/^page-\d+\.jpg$/i.test(file) || file.toLowerCase() === 'cover.jpg') {
			fs.rmSync(path.join(targetDir, file), { force: true });
		}
	});
}

function getEditionAssetDirs(imageOutputDir, slug) {
	const targetDir = path.join(imageOutputDir, slug);
	return {
		targetDir,
		pagesDir: path.join(targetDir, 'pages'),
		canvasElementsDir: path.join(targetDir, 'canvasElements'),
		imagesDir: path.join(targetDir, 'images')
	};
}

function ensureEditionAssetDirectories(imageOutputDir, slug) {
	const dirs = getEditionAssetDirs(imageOutputDir, slug);
	ensureDirectory(dirs.targetDir);
	ensureDirectory(dirs.pagesDir);
	ensureDirectory(dirs.canvasElementsDir);
	ensureDirectory(dirs.imagesDir);
	return dirs;
}

function getFirstGeneratedPagePath(targetDir) {
	if (!fs.existsSync(targetDir)) return null;

	const pageFiles = fs
		.readdirSync(targetDir)
		.map((file) => {
			const match = file.match(/^page-(\d+)\.jpg$/i);
			if (!match) return null;
			return { file, pageNumber: Number(match[1]) };
		})
		.filter(Boolean)
		.sort((a, b) => a.pageNumber - b.pageNumber);

	if (pageFiles.length === 0) return null;
	return path.join(targetDir, pageFiles[0].file);
}

function ensureThumbFromFirstPage(imageOutputDir, slug) {
	const { pagesDir, canvasElementsDir } = ensureEditionAssetDirectories(imageOutputDir, slug);
	const firstPage = getFirstGeneratedPagePath(pagesDir);
	if (!firstPage) return false;

	const thumb = path.join(canvasElementsDir, 'cover.jpg');
	fs.copyFileSync(firstPage, thumb);
	console.log(`Created thumb: ${thumb}`);
	return true;
}

function defaultGeneratePages(pdfPath, slug, imageOutputDir) {
	const { pagesDir } = ensureEditionAssetDirectories(imageOutputDir, slug);

	console.log(`Processing: ${pdfPath} -> ${pagesDir}`);

	clearGeneratedPages(pagesDir);
	execFileSync('pdftocairo', ['-jpeg', pdfPath, path.join(pagesDir, 'page')]);
	if (!ensureThumbFromFirstPage(imageOutputDir, slug)) {
		throw new Error(`No generated page JPGs found for ${slug} after conversion.`);
	}
}

function hasGeneratedPages(imageOutputDir, slug) {
	const { pagesDir } = getEditionAssetDirs(imageOutputDir, slug);
	if (!fs.existsSync(pagesDir)) return false;

	const files = fs.readdirSync(pagesDir);
	return files.some((file) => /^page-\d+\.jpg$/i.test(file));
}

function hasThumb(imageOutputDir, slug) {
	const { canvasElementsDir } = getEditionAssetDirs(imageOutputDir, slug);
	return fs.existsSync(path.join(canvasElementsDir, 'cover.jpg'));
}

function ensureAssetsForPdf(pdfPath, slug, imageOutputDir, options = {}) {
	const { forceRegenerate = false, generatePagesFn = defaultGeneratePages } = options;
	ensureEditionAssetDirectories(imageOutputDir, slug);

	if (forceRegenerate) {
		generatePagesFn(pdfPath, slug, imageOutputDir);
		return;
	}

	if (hasGeneratedPages(imageOutputDir, slug)) {
		console.log(`[OK] ${pdfPath} already has page JPGs.`);
		if (!hasThumb(imageOutputDir, slug)) {
			console.log(`[MISSING THUMB] ${pdfPath} has pages but no thumb. Creating thumb...`);
			if (!ensureThumbFromFirstPage(imageOutputDir, slug)) {
				throw new Error(`[MISSING THUMB] Could not create thumb for ${pdfPath}.`);
			}
		}
		return;
	}

	console.log(`[MISSING JPGS] ${pdfPath} has no page JPGs. Re-generating...`);
	generatePagesFn(pdfPath, slug, imageOutputDir);
}

function moveEditionAssets(imageOutputDir, fromSlug, toSlug) {
	if (!fromSlug || !toSlug || fromSlug === toSlug) return;

	const fromDir = path.join(imageOutputDir, fromSlug);
	const toDir = path.join(imageOutputDir, toSlug);

	if (!fs.existsSync(fromDir)) return;
	if (fs.existsSync(toDir)) {
		throw new Error(`Cannot move assets from '${fromSlug}' to '${toSlug}': target already exists.`);
	}

	fs.renameSync(fromDir, toDir);
}

function removeEditionAssets(imageOutputDir, slug) {
	if (!slug) return;
	fs.rmSync(path.join(imageOutputDir, slug), { recursive: true, force: true });
}

function getPdfFilesRecursive(rootDir, currentDir = rootDir) {
	if (!fs.existsSync(currentDir)) return [];

	const entries = fs.readdirSync(currentDir, { withFileTypes: true });
	const pdfFiles = [];

	entries.forEach((entry) => {
		const fullPath = path.join(currentDir, entry.name);
		if (entry.isDirectory()) {
			pdfFiles.push(...getPdfFilesRecursive(rootDir, fullPath));
			return;
		}

		if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
			pdfFiles.push(path.relative(rootDir, fullPath));
		}
	});

	return pdfFiles;
}

function computeFileChecksum(filePath) {
	const hash = createHash('sha256');
	hash.update(fs.readFileSync(filePath));
	return hash.digest('hex');
}

function normalizeStoredRelativePath(value) {
	if (!value || typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	return trimmed.split(/[\\/]+/).join(path.sep);
}

function toDownloadHref(relativePath) {
	return `pdfs/${relativePath.split(path.sep).join('/')}`;
}

export function canonicalRelativePdfPath(name) {
	return `${name}.pdf`;
}

function relativePathFromDownloadHref(downloadHref) {
	if (!downloadHref || typeof downloadHref !== 'string') return undefined;
	const normalizedHref = downloadHref.replace(/^\/+/, '');
	if (!normalizedHref.startsWith('pdfs/')) return undefined;
	return normalizeStoredRelativePath(normalizedHref.slice('pdfs/'.length));
}

function deriveStoredPdfRelativePath(entry) {
	return normalizeStoredRelativePath(entry.pdfRelativePath) || relativePathFromDownloadHref(entry.downloadHref);
}

function normalizeEditionEntry(entry) {
	const pdfRelativePath = deriveStoredPdfRelativePath(entry);
	const normalizedStatus =
		entry.pdfStatus === PDF_STATUS_ARCHIVED
			? PDF_STATUS_ARCHIVED
			: pdfRelativePath || entry.downloadHref
				? PDF_STATUS_ACTIVE
				: PDF_STATUS_ARCHIVED;

	return {
		...entry,
		downloadHref: entry.downloadHref || undefined,
		pdfId: entry.pdfId || undefined,
		pdfStatus: normalizedStatus,
		pdfRelativePath,
		pdfChecksum: entry.pdfChecksum || undefined
	};
}

function buildWritableEdition(entry) {
	const ordered = {
		name: entry.name,
		id: entry.id,
		subtitle: entry.subtitle,
		isbn: entry.isbn,
		description: entry.description,
		publishingDate: entry.publishingDate,
		coPublisher: entry.coPublisher,
		coPublisherUrl: entry.coPublisherUrl,
		editors: entry.editors,
		designers: entry.designers,
		contributors: entry.contributors,
		keywords: entry.keywords,
		parentProject: entry.parentProject,
		parentUrl: entry.parentUrl,
		pdfId: entry.pdfId,
		pdfStatus: entry.pdfStatus
	};

	if (entry.downloadHref) {
		ordered.downloadHref = entry.downloadHref;
	}
	if (entry.pdfRelativePath) {
		ordered.pdfRelativePath = entry.pdfRelativePath;
	}
	if (entry.pdfChecksum) {
		ordered.pdfChecksum = entry.pdfChecksum;
	}

	return ordered;
}

function readDatasource(datasourcePath) {
	const content = fs.readFileSync(datasourcePath, 'utf8');
	const startMatch = content.indexOf('editions: Edition[] =');
	if (startMatch === -1) {
		throw new Error(`Could not find editions array in ${datasourcePath}`);
	}

	const equalsIndex = content.indexOf('=', startMatch);
	if (equalsIndex === -1) {
		throw new Error(`Could not find editions assignment in ${datasourcePath}`);
	}

	const openingBracket = content.indexOf('[', equalsIndex);
	const closingBracket = content.lastIndexOf(']');
	if (openingBracket === -1 || closingBracket === -1 || closingBracket < openingBracket) {
		throw new Error(`Could not parse editions array boundaries in ${datasourcePath}`);
	}

	const editionsStr = content.slice(openingBracket, closingBracket + 1);
	const editions = vm.runInNewContext(`(${editionsStr})`);

	if (!Array.isArray(editions)) {
		throw new Error(`Parsed editions is not an array in ${datasourcePath}`);
	}

	return {
		editions,
		prefix: content.slice(0, openingBracket),
		suffix: content.slice(closingBracket + 1)
	};
}

function toTsLiteral(value, depth = 0) {
	const indent = '    '.repeat(depth);
	const childIndent = '    '.repeat(depth + 1);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map((item) => `${childIndent}${toTsLiteral(item, depth + 1)}`).join(',\n');
		return `[\n${items}\n${indent}]`;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) return '{}';
		const props = entries
			.map(([key, val]) => `${childIndent}${key}: ${toTsLiteral(val, depth + 1)}`)
			.join(',\n');
		return `{\n${props}\n${indent}}`;
	}

	if (typeof value === 'string') {
		return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
	}

	return String(value);
}

function writeDatasource(datasourcePath, editions, prefix, suffix) {
	const writable = editions.map(buildWritableEdition);
	const updatedContent = `${prefix}${toTsLiteral(writable)}${suffix}`;
	fs.writeFileSync(datasourcePath, updatedContent);
}

function assertUniqueActiveEntries(editions) {
	const activeEditions = editions.filter((entry) => entry.pdfStatus === PDF_STATUS_ACTIVE);
	const seenIds = new Map();
	const seenNames = new Map();

	activeEditions.forEach((entry, index) => {
		if (entry.pdfId) {
			const duplicateIndex = seenIds.get(entry.pdfId);
			if (duplicateIndex !== undefined) {
				throw new Error(`Duplicate active pdfId '${entry.pdfId}' at indexes ${duplicateIndex} and ${index}.`);
			}
			seenIds.set(entry.pdfId, index);
		}

		const duplicateNameIndex = seenNames.get(entry.name);
		if (duplicateNameIndex !== undefined) {
			throw new Error(`Duplicate active edition name '${entry.name}' at indexes ${duplicateNameIndex} and ${index}.`);
		}
		seenNames.set(entry.name, index);
	});
}

function buildPdfRecords(pdfSourceDir) {
	const pdfFiles = getPdfFilesRecursive(pdfSourceDir);

	return pdfFiles.map((relativePath) => {
		const normalizedRelativePath = normalizeStoredRelativePath(relativePath);
		const rawName = path.basename(normalizedRelativePath, '.pdf');
		const pdfPath = path.join(pdfSourceDir, normalizedRelativePath);

		return {
			relativePath: normalizedRelativePath,
			rawName,
			slug: slugify(rawName),
			pdfPath,
			checksum: computeFileChecksum(pdfPath)
		};
	});
}

function updatePdfRecordLocation(pdfRecord, pdfSourceDir, relativePath) {
	const normalizedRelativePath = normalizeStoredRelativePath(relativePath);
	pdfRecord.relativePath = normalizedRelativePath;
	pdfRecord.rawName = path.basename(normalizedRelativePath, '.pdf');
	pdfRecord.slug = slugify(pdfRecord.rawName);
	pdfRecord.pdfPath = path.join(pdfSourceDir, normalizedRelativePath);
}

function createPdfIndexMap(pdfRecords) {
	return new Map(pdfRecords.map((record, index) => [record.relativePath, index]));
}

function renamePdfFile(pdfSourceDir, pdfRecord, targetRelativePath, pdfIndexByPath, pdfIndex) {
	const normalizedTargetPath = normalizeStoredRelativePath(targetRelativePath);
	const existingIndex = pdfIndexByPath.get(normalizedTargetPath);
	if (existingIndex !== undefined && existingIndex !== pdfIndex) {
		throw new Error(
			`Cannot rename '${pdfRecord.relativePath}' to '${normalizedTargetPath}': target already belongs to another PDF.`
		);
	}

	const fromPath = path.join(pdfSourceDir, pdfRecord.relativePath);
	const toPath = path.join(pdfSourceDir, normalizedTargetPath);
	ensureDirectory(path.dirname(toPath));
	fs.renameSync(fromPath, toPath);

	pdfIndexByPath.delete(pdfRecord.relativePath);
	updatePdfRecordLocation(pdfRecord, pdfSourceDir, normalizedTargetPath);
	pdfIndexByPath.set(pdfRecord.relativePath, pdfIndex);
}

function createEditionFromPdf(pdfPath, relativePdfPath, checksum, getPdfMetadataFn, idGenerator) {
	const metadata = getPdfMetadataFn(pdfPath);
	const fileBaseName = path.basename(relativePdfPath, '.pdf');
	const editionTitle = normalizeWhitespace(metadata['Title']) || fileBaseName;
	const publishingDate = formatPublishingDate(metadata['CreationDate'] || '');
	const publishingYear = (publishingDate.match(/\b(19|20)\d{2}\b/) || [])[0];
	const editors = splitPeopleList(metadata['Author'] || '');
	const contributors = splitPeopleList(metadata['Contributor'] || '');
	const designers = splitPeopleList(metadata['Designer'] || '');
	const keywords = splitKeywords(metadata['Keywords'] || '');
	const isbn = extractIsbn(
		[
			metadata['ISBN'] || '',
			metadata['Identifier'] || '',
			metadata['Title'] || '',
			metadata['Subject'] || '',
			metadata['Keywords'] || ''
		].join(' ')
	);

	return {
		id: publishingYear || new Date().getFullYear().toString(),
		name: fileBaseName,
		subtitle: editionTitle,
		isbn,
		description: normalizeWhitespace(metadata['Subject'] || ''),
		publishingDate,
		coPublisher: normalizeWhitespace(metadata['Publisher'] || ''),
		coPublisherUrl: '',
		downloadHref: toDownloadHref(relativePdfPath),
		editors,
		designers,
		contributors,
		keywords,
		parentProject: '',
		parentUrl: '',
		pdfId: idGenerator(),
		pdfStatus: PDF_STATUS_ACTIVE,
		pdfRelativePath: relativePdfPath,
		pdfChecksum: checksum
	};
}

export function syncPdfLibrary(options = {}) {
	const pdfSourceDir = options.pdfSourceDir || DEFAULT_PDF_SOURCE_DIR;
	const imageOutputDir = options.imageOutputDir || DEFAULT_IMAGE_OUTPUT_DIR;
	const datasourcePath = options.datasourcePath || DEFAULT_DATASOURCE_PATH;
	const getPdfMetadataFn = options.getPdfMetadataFn || getPdfMetadata;
	const generatePagesFn = options.generatePagesFn || defaultGeneratePages;
	const idGenerator = options.idGenerator || randomUUID;

	const { editions: rawEditions, prefix, suffix } = readDatasource(datasourcePath);
	const editions = rawEditions.map(normalizeEditionEntry);

	ensureDirectory(pdfSourceDir);
	ensureDirectory(imageOutputDir);

	assertUniqueActiveEntries(editions);

	const pdfRecords = buildPdfRecords(pdfSourceDir);
	const pdfIndexByPath = createPdfIndexMap(pdfRecords);
	const boundPdfIndexes = new Set();
	const boundEntryToPdfIndex = new Map();

	function bindEntryToPdf(entryIndex, pdfIndex) {
		if (boundEntryToPdfIndex.has(entryIndex)) return false;
		if (boundPdfIndexes.has(pdfIndex)) return false;
		boundEntryToPdfIndex.set(entryIndex, pdfIndex);
		boundPdfIndexes.add(pdfIndex);
		return true;
	}

	console.log('--- SYNC START ---');

	editions.forEach((entry, entryIndex) => {
		if (entry.pdfStatus !== PDF_STATUS_ACTIVE || !entry.pdfRelativePath) return;
		const pdfIndex = pdfIndexByPath.get(entry.pdfRelativePath);
		if (pdfIndex !== undefined) {
			bindEntryToPdf(entryIndex, pdfIndex);
		}
	});

	editions.forEach((entry, entryIndex) => {
		if (entry.pdfStatus !== PDF_STATUS_ACTIVE || boundEntryToPdfIndex.has(entryIndex)) return;
		const desiredRelativePath = canonicalRelativePdfPath(entry.name);
		const pdfIndex = pdfIndexByPath.get(desiredRelativePath);
		if (pdfIndex !== undefined) {
			bindEntryToPdf(entryIndex, pdfIndex);
		}
	});

	editions.forEach((entry, entryIndex) => {
		if (entry.pdfStatus !== PDF_STATUS_ARCHIVED || boundEntryToPdfIndex.has(entryIndex)) return;
		const desiredRelativePath = canonicalRelativePdfPath(entry.name);
		const pdfIndex = pdfIndexByPath.get(desiredRelativePath);
		if (pdfIndex !== undefined) {
			bindEntryToPdf(entryIndex, pdfIndex);
		}
	});

	editions.forEach((entry, entryIndex) => {
		const pdfIndex = boundEntryToPdfIndex.get(entryIndex);
		if (pdfIndex === undefined) return;

		const pdfRecord = pdfRecords[pdfIndex];
		const previousRelativePath = entry.pdfRelativePath;
		const previousSlug = previousRelativePath
			? slugify(path.basename(previousRelativePath, '.pdf'))
			: slugify(entry.name);
		const nextRelativePath = canonicalRelativePdfPath(entry.name);
		const nextSlug = slugify(entry.name);
		const shouldRenamePdf = pdfRecord.relativePath !== nextRelativePath;
		const isReactivated = entry.pdfStatus !== PDF_STATUS_ACTIVE;
		const checksumChanged = entry.pdfChecksum !== pdfRecord.checksum;

		if (!entry.pdfId) {
			entry.pdfId = idGenerator();
		}

		if (shouldRenamePdf) {
			console.log(`[RENAME:canonical] '${pdfRecord.relativePath}' -> '${nextRelativePath}'`);
			moveEditionAssets(imageOutputDir, previousSlug, nextSlug);
			renamePdfFile(pdfSourceDir, pdfRecord, nextRelativePath, pdfIndexByPath, pdfIndex);
		}

		entry.pdfStatus = PDF_STATUS_ACTIVE;
		entry.pdfRelativePath = pdfRecord.relativePath;
		entry.downloadHref = toDownloadHref(pdfRecord.relativePath);
		entry.pdfChecksum = pdfRecord.checksum;

		const shouldRegenerateAssets = shouldRenamePdf || isReactivated || checksumChanged;
		ensureAssetsForPdf(pdfRecord.pdfPath, nextSlug, imageOutputDir, {
			forceRegenerate: shouldRegenerateAssets,
			generatePagesFn
		});
	});

	editions.forEach((entry) => {
		if (entry.pdfId) return;
		entry.pdfId = idGenerator();
	});

	editions.forEach((entry, entryIndex) => {
		if (boundEntryToPdfIndex.has(entryIndex)) return;

		if (entry.pdfStatus === PDF_STATUS_ACTIVE) {
			console.warn(`[ARCHIVE] '${entry.name}' has no linked PDF. Marking as archived old version.`);
			const storedSlug = entry.pdfRelativePath
				? slugify(path.basename(entry.pdfRelativePath, '.pdf'))
				: '';
			removeEditionAssets(imageOutputDir, slugify(entry.name));
			if (storedSlug) {
				removeEditionAssets(imageOutputDir, storedSlug);
			}
		}

		entry.pdfStatus = PDF_STATUS_ARCHIVED;
		entry.downloadHref = undefined;
		entry.pdfRelativePath = undefined;
		entry.pdfChecksum = undefined;
	});

	pdfRecords.forEach((pdfRecord, pdfIndex) => {
		if (boundPdfIndexes.has(pdfIndex)) return;

		const canonicalPath = canonicalRelativePdfPath(pdfRecord.rawName);
		if (pdfRecord.relativePath !== canonicalPath) {
			console.log(`[RENAME:new] '${pdfRecord.relativePath}' -> '${canonicalPath}'`);
			renamePdfFile(pdfSourceDir, pdfRecord, canonicalPath, pdfIndexByPath, pdfIndex);
		}

		console.log(`[NEW PDF] Found ${pdfRecord.relativePath}, adding to datasource...`);
		ensureAssetsForPdf(pdfRecord.pdfPath, pdfRecord.slug, imageOutputDir, {
			forceRegenerate: true,
			generatePagesFn
		});
		editions.push(
			createEditionFromPdf(
				pdfRecord.pdfPath,
				pdfRecord.relativePath,
				pdfRecord.checksum,
				getPdfMetadataFn,
				idGenerator
			)
		);
	});

	assertUniqueActiveEntries(editions);

	const activeSlugs = new Set(
		editions
			.filter((entry) => entry.pdfStatus === PDF_STATUS_ACTIVE)
			.map((entry) => slugify(entry.name))
	);
	const assetFolders = fs
		.readdirSync(imageOutputDir)
		.filter((file) => fs.statSync(path.join(imageOutputDir, file)).isDirectory());

	assetFolders.forEach((folder) => {
		if (!activeSlugs.has(folder)) {
			console.warn(`[CLEANUP] Orphaned Asset Folder: '${folder}'. Removing...`);
			fs.rmSync(path.join(imageOutputDir, folder), { recursive: true, force: true });
		}
	});

	writeDatasource(datasourcePath, editions, prefix, suffix);
	console.log(`Synced ${datasourcePath}: ${editions.length} entries.`);
	console.log('--- SYNC END ---');
	return editions;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
	syncPdfLibrary();
}
