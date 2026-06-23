import { getAllSummaries, type SummaryEntry } from './summaries';

export type PublicListing = NonNullable<SummaryEntry['data']['publicListings']>[number];

export type ParticipantRecord = {
	repo: string;
	url: string;
	label: string;
	firstWeek: string;
	lastWeek: string;
	weeks: string[];
	latestListing: PublicListing;
};

export async function getAllTimeParticipants(): Promise<ParticipantRecord[]> {
	const summaries = await getAllSummaries();
	const byRepo = new Map<string, ParticipantRecord>();

	for (const summary of summaries) {
		const week = summary.data.week;
		for (const listing of summary.data.publicListings ?? []) {
			const existing = byRepo.get(listing.repo);
			if (!existing) {
				byRepo.set(listing.repo, {
					repo: listing.repo,
					url: listing.url,
					label: listing.label,
					firstWeek: week,
					lastWeek: week,
					weeks: [week],
					latestListing: listing,
				});
				continue;
			}

			existing.weeks.push(week);
			if (week < existing.firstWeek) existing.firstWeek = week;
			if (week > existing.lastWeek) {
				existing.lastWeek = week;
				existing.latestListing = listing;
			}
			if (listing.label !== existing.label) existing.label = listing.label;
		}
	}

	for (const record of byRepo.values()) {
		record.weeks.sort((a, b) => b.localeCompare(a));
	}

	return [...byRepo.values()].sort((a, b) => a.repo.localeCompare(b.repo));
}
