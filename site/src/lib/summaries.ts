import { getCollection, type CollectionEntry } from 'astro:content';

export type SummaryEntry = CollectionEntry<'summaries'>;

export async function getAllSummaries(): Promise<SummaryEntry[]> {
	const items = await getCollection('summaries');
	return items.sort((a, b) => b.data.week.localeCompare(a.data.week));
}

export async function getLatestSummary(): Promise<SummaryEntry | undefined> {
	const items = await getAllSummaries();
	return items[0];
}

export async function getSummaryByWeek(week: string): Promise<SummaryEntry | undefined> {
	const items = await getCollection('summaries', ({ data }) => data.week === week);
	return items[0];
}

export function formatGeneratedAt(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'UTC',
	});
}

export function formatPct(pct: number): string {
	return `${Math.round(pct * 100)}%`;
}
