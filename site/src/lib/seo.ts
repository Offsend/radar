import type { SummaryEntry } from './summaries';
import { buildReportSummary, formatReportHeading, getReportLabel } from './summaries';

export const SITE_URL = 'https://radar.offsend.io';
export const SITE_NAME = 'Offsend Radar';
export const DEFAULT_OG_IMAGE = '/og.svg';
export const DEFAULT_DESCRIPTION =
	'Weekly fleet scans of AI-context hygiene in open-source repositories. Anonymous aggregates — no secrets collected.';

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
	const heading = formatReportHeading(summaries, summary.data.week);
	const label = getReportLabel(summaries, summary.data.week);
	const summaryText = buildReportSummary(summary).join(' ');

	return {
		'@context': 'https://schema.org',
		'@type': 'Report',
		name: heading.title,
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
