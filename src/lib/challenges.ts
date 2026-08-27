import type { CollectionEntry } from "astro:content";

export type ProblemEntry = CollectionEntry<"problems">;

export type ProblemGroup = {
	category: string;
	entries: ProblemEntry[];
};

export function groupEntriesByCategory(entries: ProblemEntry[]): ProblemGroup[] {
	const sortedEntries = [...entries].sort((a, b) => a.data.order - b.data.order);
	const groups = new Map<string, ProblemEntry[]>();
	for (const entry of sortedEntries) {
		const group = groups.get(entry.data.category) || [];
		group.push(entry);
		groups.set(entry.data.category, group);
	}
	return [...groups].map(([category, groupEntries]) => ({
		category,
		entries: groupEntries,
	}));
}

export function getLodashVersion(entries: ProblemEntry[]) {
	const firstEntry = entries[0];
	if (!firstEntry) {
		throw new Error("The problem collection must contain at least one entry.");
	}
	return firstEntry.data.lodashVersion;
}
