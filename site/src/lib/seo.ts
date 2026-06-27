import type { SummaryEntry } from './summaries';
import { buildReportSummary, getReportLabel, getReportNumber } from './summaries';

export const SITE_URL = 'https://radar.offsend.io';
export const SITE_NAME = 'Offsend Radar';
export const DEFAULT_OG_IMAGE = '/og.svg';

export function ogImagePathForWeek(week: string): string {
	const match = week.match(/^(\d{4})-W(\d{2})$/);
	if (!match) return DEFAULT_OG_IMAGE;
	return `/og/${match[1]}_${Number(match[2])}.png`;
}
export const DEFAULT_DESCRIPTION =
	'Weekly fleet scans of AI-context hygiene in open-source repositories. Anonymous aggregates — no secrets collected.';

export function buildReportPageTitle(summaries: SummaryEntry[], week: string): string {
	const number = getReportNumber(summaries, week);
	return number !== undefined ? `${SITE_NAME} #${number}` : SITE_NAME;
}

export function canonicalUrl(pathname: string): string {
	const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
	return new URL(normalized, SITE_URL).href;
}

export function absoluteAssetUrl(path: string): string {
	return new URL(path, SITE_URL).href;
}

export function buildWebsiteSchema(): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_NAME,
		url: SITE_URL,
		description: DEFAULT_DESCRIPTION,
		publisher: {
			'@type': 'Organization',
			name: 'Offsend',
			url: 'https://offsend.io',
		},
	};
}

export function buildReportSchema(
	summary: SummaryEntry,
	summaries: SummaryEntry[],
	pathname: string,
): Record<string, unknown> {
	const label = getReportLabel(summaries, summary.data.week);
	const summaryText = buildReportSummary(summary).join(' ');

	return {
		'@context': 'https://schema.org',
		'@type': 'Report',
		name: buildReportPageTitle(summaries, summary.data.week),
		headline: `${label}: AI-context hygiene fleet scan`,
		description: summaryText,
		datePublished: summary.data.generatedAt,
		url: canonicalUrl(pathname),
		author: {
			'@type': 'Organization',
			name: 'Offsend',
			url: 'https://offsend.io',
		},
		publisher: {
			'@type': 'Organization',
			name: 'Offsend',
			url: 'https://offsend.io',
		},
		isPartOf: {
			'@type': 'WebSite',
			name: SITE_NAME,
			url: SITE_URL,
		},
	};
}

export function buildSummaryPageDescription(summary: SummaryEntry): string {
	return buildReportSummary(summary).join(' ').slice(0, 160);
}

export function buildArticleSchema(opts: {
	title: string;
	description: string;
	pathname: string;
}): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: opts.title,
		description: opts.description,
		url: canonicalUrl(opts.pathname),
		author: {
			'@type': 'Organization',
			name: 'Offsend',
			url: 'https://offsend.io',
		},
		publisher: {
			'@type': 'Organization',
			name: 'Offsend',
			url: 'https://offsend.io',
		},
		isPartOf: {
			'@type': 'WebSite',
			name: SITE_NAME,
			url: SITE_URL,
		},
	};
}

export function buildFaqSchema(
	faq: { q: string; a: string }[],
): Record<string, unknown> | undefined {
	if (faq.length === 0) return undefined;
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((item) => ({
			'@type': 'Question',
			name: item.q,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.a,
			},
		})),
	};
}

export function buildBreadcrumbSchema(
	items: { name: string; pathname: string }[],
): Record<string, unknown> {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: canonicalUrl(item.pathname),
		})),
	};
}
