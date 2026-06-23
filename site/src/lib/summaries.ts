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

export type IgnoreCoverageStats = {
	reposWithIgnorePct: number;
	typesInUse: number;
	totalTypes: number;
};

export function computeIgnoreCoverage(summary: SummaryEntry): IgnoreCoverageStats {
	const rules = Object.values(summary.data.ignoreFilesPresent);
	const totalTypes = rules.length;
	const typesInUse = rules.filter((rule) => rule.pct > 0).length;
	const total = rules[0]?.total ?? summary.data.cohort.scanComplete;
	const maxPresent = rules.reduce((max, rule) => Math.max(max, rule.present), 0);
	const reposWithIgnorePct = total > 0 ? maxPresent / total : 0;

	return { reposWithIgnorePct, typesInUse, totalTypes };
}

export function buildReportSummary(summary: SummaryEntry): string[] {
	const { cohort, totals, exposedPatterns } = summary.data;
	const repos = cohort.scanComplete;
	const sentences: string[] = [];

	sentences.push(
		`${repos} ${repos === 1 ? 'repository was' : 'repositories were'} scanned for AI-context hygiene.`,
	);

	if (totals.totalExposedFiles === 0) {
		sentences.push('No exposed file categories were detected in complete scans.');
	} else {
		const patternCount = exposedPatterns.length;
		sentences.push(
			`${totals.totalExposedFiles} file${totals.totalExposedFiles === 1 ? '' : 's'} matched ${patternCount} sensitive categor${patternCount === 1 ? 'y' : 'ies'} that AI tools may read.`,
		);
	}

	const { reposWithIgnorePct, typesInUse } = computeIgnoreCoverage(summary);

	if (typesInUse === 0) {
		sentences.push('No AI-oriented ignore files were detected in scanned repositories.');
	} else if (reposWithIgnorePct >= 1) {
		sentences.push(
			`All scanned repos include at least one AI ignore file (${typesInUse} type${typesInUse === 1 ? '' : 's'} in use).`,
		);
	} else {
		sentences.push(
			`${formatPct(reposWithIgnorePct)} of scanned repos include an AI ignore file (${typesInUse} type${typesInUse === 1 ? '' : 's'} in use).`,
		);
	}

	return sentences;
}

export function getNonZeroIgnoreRules(summary: SummaryEntry) {
	return Object.entries(summary.data.ignoreFilesPresent)
		.filter(([, rule]) => rule.pct > 0)
		.sort(([, a], [, b]) => b.pct - a.pct);
}

export function getAllIgnoreRules(summary: SummaryEntry) {
	return Object.entries(summary.data.ignoreFilesPresent).sort(([, a], [, b]) => b.pct - a.pct);
}
