import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const cohortSchema = z.object({
	targeted: z.number(),
	scanned: z.number(),
	skipped: z.number(),
	errors: z.number(),
	scanComplete: z.number(),
});

const ignoreRuleSchema = z.object({
	present: z.number(),
	total: z.number(),
	pct: z.number(),
});

const exposedPatternSchema = z.object({
	id: z.string(),
	category: z.string(),
	severity: z.string(),
	reposAffected: z.number(),
	totalCount: z.number(),
});

const summarySchema = z.object({
	schemaVersion: z.literal(1),
	week: z.string(),
	generatedAt: z.string(),
	toolVersionRange: z.tuple([z.string(), z.string()]),
	rulesetVersions: z.array(z.string()),
	cohort: cohortSchema,
	ignoreFilesPresent: z.record(z.string(), ignoreRuleSchema),
	exposedPatterns: z.array(exposedPatternSchema),
	totals: z.object({
		reposWithExposures: z.number(),
		totalExposedFiles: z.number(),
	}),
});

const summaries = defineCollection({
	loader: glob({ pattern: '*.json', base: './src/data/summaries' }),
	schema: summarySchema,
});

export const collections = { summaries };
