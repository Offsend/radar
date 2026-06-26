import { getCollection, type CollectionEntry } from 'astro:content';
import { formatPatternLabel } from './labels';

export type SummaryEntry = CollectionEntry<'summaries'>;

export const GIT_IGNORE_RULE_ID = 'git-ignore';

export const PRIORITY_DEDICATED_IGNORE_IDS = [
	'cursor-ignore',
	'claude-ignore',
	'ai-exclude',
	'gemini-ignore',
	'copilot-exclude',
	'llm-ignore',
] as const;

export async function getAllSummaries(): Promise<SummaryEntry[]> {
	const items = await getCollection('summaries');
	return items.sort((a, b) => b.data.week.localeCompare(a.data.week));
}

export async function getSummariesChronological(): Promise<SummaryEntry[]> {
	const items = await getAllSummaries();
	return [...items].sort((a, b) => a.data.week.localeCompare(b.data.week));
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

export function formatPct(pct: number | undefined): string {
	if (pct === undefined) return '—';
	return `${Math.round(pct * 100)}%`;
}

export function isDedicatedAiIgnoreRule(ruleId: string): boolean {
	return ruleId !== GIT_IGNORE_RULE_ID;
}

export function getGitIgnoreRule(summary: SummaryEntry) {
	return summary.data.ignoreFilesPresent[GIT_IGNORE_RULE_ID];
}

export function getGitIgnoreCoverage(summary: SummaryEntry): number {
	const stored = summary.data.ignoreCoverage?.gitIgnorePct;
	if (stored !== undefined) return stored;

	const rule = getGitIgnoreRule(summary);
	return rule?.pct ?? 0;
}

export function getDedicatedAiIgnoreCoverage(summary: SummaryEntry): number | undefined {
	const stored = summary.data.ignoreCoverage?.dedicatedAiIgnorePct;
	if (stored !== undefined) return stored;
	return undefined;
}

export type IgnoreCoverageStats = {
	gitIgnorePct: number;
	dedicatedAiIgnorePct: number | undefined;
	dedicatedTypesInUse: number;
	totalDedicatedTypes: number;
};

export function computeIgnoreCoverage(summary: SummaryEntry): IgnoreCoverageStats {
	const dedicatedRules = Object.entries(summary.data.ignoreFilesPresent).filter(([id]) =>
		isDedicatedAiIgnoreRule(id),
	);

	return {
		gitIgnorePct: getGitIgnoreCoverage(summary),
		dedicatedAiIgnorePct: getDedicatedAiIgnoreCoverage(summary),
		dedicatedTypesInUse: dedicatedRules.filter(([, rule]) => rule.pct > 0).length,
		totalDedicatedTypes: dedicatedRules.length,
	};
}

export function getDedicatedIgnoreRules(summary: SummaryEntry) {
	return Object.entries(summary.data.ignoreFilesPresent)
		.filter(([id]) => isDedicatedAiIgnoreRule(id))
		.sort(([, a], [, b]) => b.pct - a.pct);
}

export function getPriorityDedicatedIgnoreRules(summary: SummaryEntry) {
	const rules = summary.data.ignoreFilesPresent;

	return PRIORITY_DEDICATED_IGNORE_IDS.map((id) => [id, rules[id] ?? { present: 0, total: 0, pct: 0 }] as const);
}

export function getTopRiskSignalCategory(summary: SummaryEntry): string | undefined {
	const patterns = [...summary.data.exposedPatterns].sort((a, b) => b.totalCount - a.totalCount);
	return patterns[0] ? formatPatternLabel(patterns[0].id) : undefined;
}

export function getReportNumber(summaries: SummaryEntry[], week: string): number | undefined {
	const sorted = [...summaries].sort((a, b) => a.data.week.localeCompare(b.data.week));
	const index = sorted.findIndex((entry) => entry.data.week === week);
	return index >= 0 ? index + 1 : undefined;
}

export function getReportLabel(summaries: SummaryEntry[], week: string): string {
	const number = getReportNumber(summaries, week);
	return number !== undefined ? `Radar #${number}` : week;
}

export function formatIsoWeekRange(weekId: string): string | undefined {
	const match = weekId.match(/^(\d{4})-W(\d{2})$/);
	if (!match) return undefined;

	const year = Number(match[1]);
	const week = Number(match[2]);

	const jan4 = new Date(Date.UTC(year, 0, 4));
	const jan4Day = jan4.getUTCDay() || 7;
	const week1Monday = new Date(jan4);
	week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

	const monday = new Date(week1Monday);
	monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

	const sunday = new Date(monday);
	sunday.setUTCDate(monday.getUTCDate() + 6);

	const monthDay = (date: Date) =>
		date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

	if (monday.getUTCMonth() === sunday.getUTCMonth()) {
		return `${monthDay(monday)}–${sunday.getUTCDate()}, ${monday.getUTCFullYear()}`;
	}

	return `${monthDay(monday)} – ${monthDay(sunday)}, ${sunday.getUTCFullYear()}`;
}

export function formatReportHeading(
	summaries: SummaryEntry[],
	week: string,
): { title: string; tagline?: string } {
	const number = getReportNumber(summaries, week);
	if (number === undefined) return { title: week };

	const taglineParts: string[] = [];
	if (number === 1) taglineParts.push('First report');

	const dateRange = formatIsoWeekRange(week);
	if (dateRange) taglineParts.push(dateRange);

	return {
		title: getReportLabel(summaries, week),
		tagline: taglineParts.length > 0 ? taglineParts.join(' · ') : undefined,
	};
}

export function buildReportSummary(summary: SummaryEntry): string[] {
	const { cohort, totals, exposedPatterns } = summary.data;
	const repos = cohort.scanComplete;
	const sentences: string[] = [];

	sentences.push(
		`${repos} ${repos === 1 ? 'repository was' : 'repositories were'} scanned for AI-context hygiene.`,
	);

	if (totals.totalExposedFiles === 0) {
		sentences.push('No AI-context risk signal categories were detected in complete scans.');
	} else {
		const patternCount = exposedPatterns.length;
		sentences.push(
			`${totals.totalExposedFiles} AI-context risk signal${totals.totalExposedFiles === 1 ? '' : 's'} matched ${patternCount} sensitive path categor${patternCount === 1 ? 'y' : 'ies'}.`,
		);
	}

	const { gitIgnorePct, dedicatedAiIgnorePct, dedicatedTypesInUse } = computeIgnoreCoverage(summary);

	const dedicatedCoverageText =
		dedicatedAiIgnorePct === undefined
			? 'dedicated AI ignore coverage is unavailable for this report'
			: `${formatPct(dedicatedAiIgnorePct)} include dedicated AI ignore files${dedicatedTypesInUse > 0 ? ` (${dedicatedTypesInUse} type${dedicatedTypesInUse === 1 ? '' : 's'} in use)` : ''}`;

	sentences.push(
		`${formatPct(gitIgnorePct)} of scanned repos include a .gitignore; ${dedicatedCoverageText}.`,
	);

	return sentences;
}

export function buildMainTakeaway(summary: SummaryEntry): string[] {
	const { gitIgnorePct, dedicatedAiIgnorePct } = computeIgnoreCoverage(summary);
	const topPatterns = [...summary.data.exposedPatterns]
		.sort((a, b) => b.totalCount - a.totalCount)
		.slice(0, 4)
		.map((pattern) => formatPatternLabel(pattern.id));

	const paragraphs: string[] = [];

	if (gitIgnorePct >= 0.5) {
		paragraphs.push('Developers already have a `.gitignore` habit.');
	} else {
		paragraphs.push('`.gitignore` coverage is still uneven across scanned repos.');
	}

	paragraphs.push('But dedicated AI-context hygiene is still early.');

	if (topPatterns.length > 0) {
		const categoryList =
			topPatterns.length === 1
				? topPatterns[0]
				: `${topPatterns.slice(0, -1).join(', ')}, and ${topPatterns[topPatterns.length - 1]}`;

		if (dedicatedAiIgnorePct === undefined) {
			paragraphs.push(
				`In this sample, ${categoryList} ${topPatterns.length === 1 ? 'was' : 'were'} the most common AI-context risk signals.`,
			);
		} else if (dedicatedAiIgnorePct <= 0.1) {
			paragraphs.push(
				`In this sample, dedicated AI ignore files were rare, while ${categoryList} ${topPatterns.length === 1 ? 'was' : 'were'} the most common AI-context risk signals.`,
			);
		} else {
			paragraphs.push(
				`In this sample, ${formatPct(dedicatedAiIgnorePct)} of repos had dedicated AI ignore files, while ${categoryList} ${topPatterns.length === 1 ? 'was' : 'were'} the most common AI-context risk signals.`,
			);
		}
	}

	return paragraphs;
}

export function getNonZeroIgnoreRules(summary: SummaryEntry) {
	return getDedicatedIgnoreRules(summary).filter(([, rule]) => rule.pct > 0);
}

export function getAllIgnoreRules(summary: SummaryEntry) {
	return getDedicatedIgnoreRules(summary);
}
