import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const PDF_SOURCE_DIR = 'static/pdfs';
const IMAGE_OUTPUT_DIR = 'src/lib/media/editions';
const DATASOURCE_PATH = 'src/lib/data/datasource.ts';

function slugify(text) {
	return text
		.toString()
		.normalize('NFD') // split an accented letter into the base letter and the accent
		.replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-') // replace spaces with -
		.replace(/[^\w\.-]+/g, '') // remove all non-word chars
		.replace(/\-\-+/g, '-'); // replace multiple - with single -
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

function getPdfMetadata(pdfPath) {
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

function clearGeneratedPages(targetDir) {
	if (!fs.existsSync(targetDir)) return;

	const files = fs.readdirSync(targetDir);
	files.forEach((file) => {
		if (/^page-\d+\.jpg$/i.test(file) || file.toLowerCase() === 'cover.jpg') {
			fs.rmSync(path.join(targetDir, file), { force: true });
		}
	});
}

function getEditionAssetDirs(slug) {
	const targetDir = path.join(IMAGE_OUTPUT_DIR, slug);
	return {
		targetDir,
		pagesDir: path.join(targetDir, 'pages'),
		canvasElementsDir: path.join(targetDir, 'canvasElements'),
		imagesDir: path.join(targetDir, 'images')
	};
}

function ensureDirectory(directoryPath) {
	if (!fs.existsSync(directoryPath)) {
		fs.mkdirSync(directoryPath, { recursive: true });
	}
}

function ensureEditionAssetDirectories(slug) {
	const dirs = getEditionAssetDirs(slug);
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

function ensureThumbFromFirstPage(slug) {
	const { pagesDir, canvasElementsDir } = ensureEditionAssetDirectories(slug);
	const firstPage = getFirstGeneratedPagePath(pagesDir);
	if (!firstPage) return false;

	const thumb = path.join(canvasElementsDir, 'cover.jpg');
	fs.copyFileSync(firstPage, thumb);
	console.log(`Created thumb: ${thumb}`);
	return true;
}

function generatePages(pdfPath, slug) {
	const { pagesDir } = ensureEditionAssetDirectories(slug);

	console.log(`Processing: ${pdfPath} -> ${pagesDir}`);

	// Split PDF into JPGs
	try {
		clearGeneratedPages(pagesDir);
		execFileSync('pdftocairo', ['-jpeg', pdfPath, path.join(pagesDir, 'page')]);
		if (!ensureThumbFromFirstPage(slug)) {
			throw new Error(`No generated page JPGs found for ${slug} after conversion.`);
		}
	} catch (e) {
		console.error(`Error splitting PDF ${pdfPath}:`, e);
		throw e;
	}
}

function createEditionFromPdf(pdfPath, slug, relativePdfPath) {
	const metadata = getPdfMetadata(pdfPath);
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
		downloadHref: `${path.posix.join('pdfs', relativePdfPath.split(path.sep).join('/'))}`,
		editors,
		designers,
		contributors,
		keywords,
		parentProject: '',
		parentUrl: ''
	};
}

function processPdf(pdfPath, slug, relativePdfPath) {
	generatePages(pdfPath, slug);
	return createEditionFromPdf(pdfPath, slug, relativePdfPath);
}

function ensureAssetsForPdf(pdfPath, slug) {
	ensureEditionAssetDirectories(slug);

	if (hasGeneratedPages(slug)) {
		console.log(`[OK] ${pdfPath} already has page JPGs.`);
		if (!hasThumb(slug)) {
			console.log(`[MISSING THUMB] ${pdfPath} has pages but no thumb. Creating thumb...`);
			if (!ensureThumbFromFirstPage(slug)) {
				throw new Error(`[MISSING THUMB] Could not create thumb for ${pdfPath}.`);
			}
		}
		return;
	}

	console.log(`[MISSING JPGS] ${pdfPath} has no page JPGs. Re-generating...`);
	generatePages(pdfPath, slug);
}

function hasGeneratedPages(slug) {
	const { pagesDir } = getEditionAssetDirs(slug);
	if (!fs.existsSync(pagesDir)) return false;

	const files = fs.readdirSync(pagesDir);
	return files.some((file) => /^page-\d+\.jpg$/i.test(file));
}

function hasThumb(slug) {
	const { canvasElementsDir } = getEditionAssetDirs(slug);
	return fs.existsSync(path.join(canvasElementsDir, 'cover.jpg'));
}

function getPdfFilesRecursive(rootDir, currentDir = rootDir) {
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

function readDatasource() {
	const content = fs.readFileSync(DATASOURCE_PATH, 'utf8');
	const startMatch = content.indexOf('editions: Edition[] =');
	if (startMatch === -1) {
		throw new Error(`Could not find editions array in ${DATASOURCE_PATH}`);
	}

	const equalsIndex = content.indexOf('=', startMatch);
	if (equalsIndex === -1) {
		throw new Error(`Could not find editions assignment in ${DATASOURCE_PATH}`);
	}

	const openingBracket = content.indexOf('[', equalsIndex);
	const closingBracket = content.lastIndexOf(']');
	if (openingBracket === -1 || closingBracket === -1 || closingBracket < openingBracket) {
		throw new Error(`Could not parse editions array boundaries in ${DATASOURCE_PATH}`);
	}

	const editionsStr = content.slice(openingBracket, closingBracket + 1);
	const editions = vm.runInNewContext(`(${editionsStr})`);

	if (!Array.isArray(editions)) {
		throw new Error(`Parsed editions is not an array in ${DATASOURCE_PATH}`);
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

function writeDatasource(editions, prefix, suffix) {
	const updatedContent = `${prefix}${toTsLiteral(editions)}${suffix}`;
	fs.writeFileSync(DATASOURCE_PATH, updatedContent);
}

function buildPdfRecords() {
	const pdfFiles = getPdfFilesRecursive(PDF_SOURCE_DIR);

	return pdfFiles.map((relativePath) => {
		const rawName = path.basename(relativePath, '.pdf');
		const slug = slugify(rawName);
		const pdfPath = path.join(PDF_SOURCE_DIR, relativePath);
		const normalizedPath = relativePath.split(path.sep).join('/');
		const metadata = getPdfMetadata(pdfPath);

		return {
			relativePath,
			normalizedPath,
			rawName,
			slug,
			pdfPath,
			downloadHref: `pdfs/${normalizedPath}`,
			titleSlug: slugify(metadata['Title'] || rawName)
		};
	});
}

function sync() {
	const { editions: existingEditions, prefix, suffix } = readDatasource();
	const editions = [...existingEditions];

	// Ensure directories exist
	if (!fs.existsSync(PDF_SOURCE_DIR)) fs.mkdirSync(PDF_SOURCE_DIR, { recursive: true });
	if (!fs.existsSync(IMAGE_OUTPUT_DIR)) fs.mkdirSync(IMAGE_OUTPUT_DIR, { recursive: true });

	const allAssetFiles = fs.readdirSync(IMAGE_OUTPUT_DIR);
	const assetFolders = allAssetFiles.filter((f) =>
		fs.statSync(path.join(IMAGE_OUTPUT_DIR, f)).isDirectory()
	);

	const pdfRecords = buildPdfRecords();
	const unmatchedPdfIndexes = new Set(pdfRecords.map((_, i) => i));
	const matchedEntryIndexes = new Set();
	const matches = [];

	console.log('--- SYNC START ---');
	console.log(
		'Existing in JSON:',
		editions.map((edition) => slugify(edition?.name || ''))
	);

	let hasProcessingErrors = false;

	// 1. Direct matches by slug(name)
	editions.forEach((edition, entryIndex) => {
		const editionSlug = slugify(edition?.name || '');
		const pdfIndex = pdfRecords.findIndex(
			(pdf, index) => unmatchedPdfIndexes.has(index) && pdf.slug === editionSlug
		);

		if (pdfIndex !== -1) {
			matches.push({ entryIndex, pdfIndex, reason: 'slug' });
			matchedEntryIndexes.add(entryIndex);
			unmatchedPdfIndexes.delete(pdfIndex);
		}
	});

	// 2. Rename matches by subtitle/title metadata
	editions.forEach((edition, entryIndex) => {
		if (matchedEntryIndexes.has(entryIndex)) return;
		const subtitleSlug = slugify(edition?.subtitle || '');
		if (!subtitleSlug) return;

		const candidates = Array.from(unmatchedPdfIndexes).filter(
			(pdfIndex) => pdfRecords[pdfIndex].titleSlug === subtitleSlug
		);

		if (candidates.length === 1) {
			const pdfIndex = candidates[0];
			matches.push({ entryIndex, pdfIndex, reason: 'title' });
			matchedEntryIndexes.add(entryIndex);
			unmatchedPdfIndexes.delete(pdfIndex);
		}
	});

	// 3. Conservative fallback for one-to-one rename
	const unmatchedEntryIndexes = editions
		.map((_, index) => index)
		.filter((index) => !matchedEntryIndexes.has(index));

	if (unmatchedEntryIndexes.length === 1 && unmatchedPdfIndexes.size === 1) {
		const entryIndex = unmatchedEntryIndexes[0];
		const pdfIndex = Array.from(unmatchedPdfIndexes)[0];
		matches.push({ entryIndex, pdfIndex, reason: 'fallback' });
		matchedEntryIndexes.add(entryIndex);
		unmatchedPdfIndexes.delete(pdfIndex);
	}

	// 4. Update matched entries and ensure assets
	matches.forEach(({ entryIndex, pdfIndex, reason }) => {
		const entry = editions[entryIndex];
		const pdf = pdfRecords[pdfIndex];
		const previousSlug = slugify(entry?.name || '');

		if (previousSlug !== pdf.slug) {
			console.log(`[RENAME:${reason}] '${entry.name}' -> '${pdf.rawName}'`);
		}

		entry.name = pdf.rawName;
		entry.downloadHref = pdf.downloadHref;

		try {
			ensureAssetsForPdf(pdf.pdfPath, pdf.slug);
		} catch (_) {
			hasProcessingErrors = true;
		}
	});

	// 5. Remove JSON entries that no longer have a corresponding PDF
	const filteredEditions = editions.filter((_, index) => matchedEntryIndexes.has(index));
	const removedCount = editions.length - filteredEditions.length;
	if (removedCount > 0) {
		console.warn(
			`[CLEANUP] Removed ${removedCount} orphaned JSON entr${removedCount === 1 ? 'y' : 'ies'}.`
		);
	}

	// 6. Add brand-new PDFs
	const newEditionsData = [];
	Array.from(unmatchedPdfIndexes).forEach((pdfIndex) => {
		const pdf = pdfRecords[pdfIndex];
		console.log(`[NEW PDF] Found ${pdf.relativePath}, adding to datasource...`);
		try {
			const data = processPdf(pdf.pdfPath, pdf.slug, pdf.relativePath);
			newEditionsData.push(data);
		} catch (_) {
			hasProcessingErrors = true;
		}
	});

	const finalEditions = [...filteredEditions, ...newEditionsData];

	// 7. Check for orphaned asset folders
	const activeSlugs = new Set(pdfRecords.map((record) => record.slug));
	assetFolders.forEach((folder) => {
		if (!activeSlugs.has(folder)) {
			console.warn(
				`[CLEANUP] Orphaned Asset Folder: '${folder}'. No matching PDF found. Deleting...`
			);
			fs.rmSync(path.join(IMAGE_OUTPUT_DIR, folder), { recursive: true, force: true });
		}
	});

	writeDatasource(finalEditions, prefix, suffix);
	console.log(`Synced ${DATASOURCE_PATH}: ${finalEditions.length} entries.`);

	if (hasProcessingErrors) {
		throw new Error('One or more PDFs failed to process.');
	}

	console.log('--- SYNC END ---');
}

sync();
