import { getCollection, type CollectionEntry } from 'astro:content';
import { formatPatternLabel, formatPatternShort } from './labels';

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

// Instruction/context files that add context for AI tools rather than excluding
// files from it. They must not count as "exclude coverage".
export const CONTEXT_DOC_IGNORE_IDS = ['agents-md', 'claude-md', 'cursor-project-rules'] as const;

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

export function isContextDocRule(ruleId: string): boolean {
	return (CONTEXT_DOC_IGNORE_IDS as readonly string[]).includes(ruleId);
}

// "Exclude" rules actually keep files out of AI context, unlike instruction
// docs (AGENTS.md, CLAUDE.md, project rules) which only add context.
export function isExcludeIgnoreRule(ruleId: string): boolean {
	return ruleId !== GIT_IGNORE_RULE_ID && !isContextDocRule(ruleId);
}

export function getAiExcludeCoverage(summary: SummaryEntry): number | undefined {
	return summary.data.ignoreCoverage?.aiExcludePct;
}

export function getAiContextDocCoverage(summary: SummaryEntry): number | undefined {
	return summary.data.ignoreCoverage?.aiContextDocPct;
}

export function getReposWithRiskSignalsPct(summary: SummaryEntry): number {
	const { cohort, totals } = summary.data;
	if (cohort.scanComplete === 0) return 0;
	return totals.reposWithExposures / cohort.scanComplete;
}

export function getRiskSignalsPerRepo(summary: SummaryEntry): number | undefined {
	const { cohort, totals } = summary.data;
	if (cohort.scanComplete === 0) return undefined;
	return totals.totalExposedFiles / cohort.scanComplete;
}

export type IgnoreCoverageStats = {
	aiExcludePct: number | undefined;
	excludeTypesInUse: number;
	totalExcludeTypes: number;
};

export function computeIgnoreCoverage(summary: SummaryEntry): IgnoreCoverageStats {
	const excludeRules = Object.entries(summary.data.ignoreFilesPresent).filter(([id]) =>
		isExcludeIgnoreRule(id),
	);

	return {
		aiExcludePct: getAiExcludeCoverage(summary),
		excludeTypesInUse: excludeRules.filter(([, rule]) => rule.pct > 0).length,
		totalExcludeTypes: excludeRules.length,
	};
}

export function getExcludeIgnoreRules(summary: SummaryEntry) {
	return Object.entries(summary.data.ignoreFilesPresent)
		.filter(([id]) => isExcludeIgnoreRule(id))
		.sort(([, a], [, b]) => b.pct - a.pct);
}

export function getContextDocRules(summary: SummaryEntry) {
	return Object.entries(summary.data.ignoreFilesPresent)
		.filter(([id]) => isContextDocRule(id))
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

	const { aiExcludePct, excludeTypesInUse } = computeIgnoreCoverage(summary);

	if (aiExcludePct === undefined) {
		sentences.push('AI exclude-file coverage is unavailable for this report.');
	} else {
		sentences.push(
			`${formatPct(aiExcludePct)} of scanned repos use a dedicated AI exclude file${excludeTypesInUse > 0 ? ` (${excludeTypesInUse} type${excludeTypesInUse === 1 ? '' : 's'} in use)` : ''}.`,
		);
	}

	return sentences;
}

function formatItemList(items: string[]): string {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0]!;
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function describeDominantSignalTypes(
	patterns: SummaryEntry['data']['exposedPatterns'],
): string | undefined {
	if (patterns.length === 0) return undefined;

	const severityWeight = new Map<string, number>();
	const categoryWeight = new Map<string, number>();

	for (const pattern of patterns) {
		severityWeight.set(
			pattern.severity,
			(severityWeight.get(pattern.severity) ?? 0) + pattern.totalCount,
		);
		categoryWeight.set(
			pattern.category,
			(categoryWeight.get(pattern.category) ?? 0) + pattern.totalCount,
		);
	}

	const topSeverity = [...severityWeight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

	if (topSeverity === 'required') {
		return 'mostly secret and signing path categories';
	}
	if (topSeverity === 'recommended') {
		const topCategory = [...categoryWeight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
		if (topCategory === 'cloud') return 'mostly cloud and credential config paths';
		return 'mostly credential and config path categories';
	}
	if (topSeverity === 'informational') {
		return 'mostly lower-severity path categories';
	}

	return 'across several sensitive path categories';
}

function buildRiskActionSentence(
	patternsByBreadth: SummaryEntry['data']['exposedPatterns'],
	scanComplete: number,
): string | undefined {
	if (patternsByBreadth.length === 0) return undefined;

	const topByBreadth = patternsByBreadth.slice(0, 2).map((pattern) => formatPatternLabel(pattern.id));
	const widest = patternsByBreadth[0]!;
	const isFleetWide = widest.reposAffected / scanComplete > 0.15;

	if (topByBreadth.length === 1) {
		return isFleetWide
			? `${topByBreadth[0]} reached the widest share of repos — prioritize excluding it from AI context.`
			: `Start by excluding ${topByBreadth[0]} from AI context.`;
	}

	return isFleetWide
		? `${formatItemList(topByBreadth)} reached the widest share of repos — exclude these paths from AI context first.`
		: `Start by excluding ${formatItemList(topByBreadth)} from AI context.`;
}

function buildRiskInsightSentence(
	summary: SummaryEntry,
	reposWithRiskPct: number,
	aiExcludePct: number | undefined,
	patternsByVolume: SummaryEntry['data']['exposedPatterns'],
): string | undefined {
	const { totals } = summary.data;

	if (aiExcludePct !== undefined && aiExcludePct < reposWithRiskPct - 0.001) {
		return `Far fewer repos use a dedicated AI exclude file (${formatPct(aiExcludePct)}) than show risk signals (${formatPct(reposWithRiskPct)}).`;
	}

	const avgSignalsPerRepo = totals.totalExposedFiles / totals.reposWithExposures;
	const topPattern = patternsByVolume[0];
	const topShare = topPattern ? topPattern.totalCount / totals.totalExposedFiles : 0;

	if (avgSignalsPerRepo >= 8) {
		return `Most of this week's ${totals.totalExposedFiles} risk signals came from a small set of repos.`;
	}

	if (topPattern && topShare >= 0.35) {
		return `${formatPatternLabel(topPattern.id)} alone accounted for ${formatPct(topShare)} of all matches.`;
	}

	if (aiExcludePct !== undefined && aiExcludePct > 0) {
		return `${formatPct(aiExcludePct)} of repos use a dedicated AI exclude file, yet sensitive paths still appeared where exclusions were missing.`;
	}

	return undefined;
}

export function buildMainTakeaway(summary: SummaryEntry): string[] {
	const { cohort, totals, exposedPatterns } = summary.data;
	const { aiExcludePct } = computeIgnoreCoverage(summary);
	const paragraphs: string[] = [];

	if (cohort.scanComplete === 0) {
		return ['No complete scans were available for takeaway this week.'];
	}

	if (totals.totalExposedFiles === 0) {
		paragraphs.push("No AI-context risk signals were detected in this week's complete scans.");

		if (aiExcludePct === undefined) {
			paragraphs.push('AI exclude-file coverage was not recorded for this report.');
		} else if (aiExcludePct > 0) {
			paragraphs.push(
				`${formatPct(aiExcludePct)} of repos use a dedicated AI exclude file — a useful baseline even when no signals show up in a given week.`,
			);
		} else {
			paragraphs.push(
				'Consider adding a dedicated AI exclude file before sensitive paths start appearing in agent context.',
			);
		}

		return paragraphs;
	}

	const reposWithRiskPct = getReposWithRiskSignalsPct(summary);
	const patternsByBreadth = [...exposedPatterns].sort((a, b) => b.reposAffected - a.reposAffected);
	const patternsByVolume = [...exposedPatterns].sort((a, b) => b.totalCount - a.totalCount);
	const dominantTypes = describeDominantSignalTypes(exposedPatterns);

	paragraphs.push(
		`${formatPct(reposWithRiskPct)} of scanned repos had AI-context risk signals${dominantTypes ? ` — ${dominantTypes}` : ''}.`,
	);

	const insight = buildRiskInsightSentence(
		summary,
		reposWithRiskPct,
		aiExcludePct,
		patternsByVolume,
	);
	const action = buildRiskActionSentence(patternsByBreadth, cohort.scanComplete);

	if (insight && action) {
		paragraphs.push(`${insight} ${action}`);
	} else if (insight) {
		paragraphs.push(insight);
	} else if (action) {
		paragraphs.push(action);
	}

	return paragraphs;
}

export function getNonZeroIgnoreRules(summary: SummaryEntry) {
	return getExcludeIgnoreRules(summary).filter(([, rule]) => rule.pct > 0);
}

export function getAllIgnoreRules(summary: SummaryEntry) {
	return getExcludeIgnoreRules(summary);
}

export type ExposureHook = {
	headline: string;
	lead: string;
	hasExposure: boolean;
};

export function buildExposureHook(summary: SummaryEntry): ExposureHook {
	const { cohort, totals, exposedPatterns } = summary.data;
	const repos = cohort.scanComplete;
	const repoWord = repos === 1 ? 'project' : 'projects';

	if (totals.totalExposedFiles === 0) {
		return {
			headline: 'AI coding tools read your whole repo — by default',
			lead: `Offsend Radar scanned ${repos} open-source ${repoWord} this week and found no sensitive paths exposed to AI context. Here's what good hygiene looks like — and how to check your own.`,
			hasExposure: false,
		};
	}

	const examples = formatItemList(
		[...exposedPatterns]
			.sort((a, b) => b.totalCount - a.totalCount)
			.slice(0, 3)
			.map((pattern) => formatPatternShort(pattern.id)),
	);
	const fileWord = totals.totalExposedFiles === 1 ? 'file' : 'files';

	return {
		headline: 'AI coding tools can read everything in your repo',
		lead: `Offsend Radar scanned ${repos} open-source ${repoWord} this week. ${totals.totalExposedFiles} sensitive ${fileWord}${examples ? ` — ${examples} —` : ''} were committed to ${totals.reposWithExposures} of them, in plain sight for any AI assistant with repository access.`,
		hasExposure: true,
	};
}

export function buildCtaHook(summary: SummaryEntry): string | undefined {
	const { cohort, totals } = summary.data;
	if (cohort.scanComplete === 0) return undefined;

	if (totals.totalExposedFiles === 0) {
		return `${cohort.scanComplete} repos scanned this week with no exposed paths — confirm yours stays that way:`;
	}

	return `${totals.reposWithExposures} of ${cohort.scanComplete} repos this week exposed sensitive paths to AI tools. Check yours in seconds:`;
}
