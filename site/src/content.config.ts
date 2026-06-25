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

const fleetExposedPatternSchema = z.object({
	id: z.string(),
	category: z.string(),
	severity: z.string(),
	reposAffected: z.number(),
	totalCount: z.number(),
});

const listingExposedPatternSchema = z.object({
	id: z.string(),
	category: z.string(),
	severity: z.string(),
	count: z.number(),
});

const publicListingSchema = z.object({
	repo: z.string(),
	url: z.string().url(),
	label: z.string(),
	scanComplete: z.boolean(),
	toolVersion: z.string().optional(),
	ignoreFilesPresent: z.record(z.string(), z.boolean()),
	exposedPatterns: z.array(listingExposedPatternSchema),
	totals: z.object({
		exposedFiles: z.number().optional(),
		exposedPatternTypes: z.number().optional(),
	}),
});

const ignoreCoverageSchema = z.object({
	gitIgnorePct: z.number(),
	dedicatedAiIgnorePct: z.number(),
});

const summarySchema = z.object({
	schemaVersion: z.literal(1),
	week: z.string(),
	generatedAt: z.string(),
	toolVersionRange: z.tuple([z.string(), z.string()]),
	rulesetVersions: z.array(z.string()),
	cohort: cohortSchema,
	ignoreCoverage: ignoreCoverageSchema.optional(),
	ignoreFilesPresent: z.record(z.string(), ignoreRuleSchema),
	exposedPatterns: z.array(fleetExposedPatternSchema),
	totals: z.object({
		reposWithExposures: z.number(),
		totalExposedFiles: z.number(),
	}),
	publicListings: z.array(publicListingSchema).optional(),
});

const summaries = defineCollection({
	loader: glob({ pattern: '*.json', base: './src/data/summaries' }),
	schema: summarySchema,
});

export const collections = { summaries };
