import fs from "node:fs/promises";

import type { ChallengeContentEntry } from "../../../src/domain/challenge.ts";
import { buildDocdownMarkdown, indexSectionsById, splitDocdownSections } from "./docdown-markdown.mts";
import { dedupeSlugs, parseChallengeEntries } from "./parse-docs.mts";
import { parseOfficialTests } from "./parse-tests.mts";
import type { LodashContentConfig } from "./content-config.mts";

export async function loadChallengeContent(config: LodashContentConfig): Promise<ChallengeContentEntry[]> {
	const lodashSource = await fs.readFile(config.lodashSourcePath, "utf8");
	const officialTestSource = await fs.readFile(config.officialTestPath, "utf8");
	const { moduleIdsByName } = parseOfficialTests(officialTestSource);
	const entries = dedupeSlugs(parseChallengeEntries(lodashSource, moduleIdsByName, config));
	const sections = splitDocdownSections(buildDocdownMarkdown(config));
	const sectionsById = indexSectionsById(sections);

	return entries.map((entry, order) => {
		const { docSectionId, ...challenge } = entry;
		const section = sectionsById.get(docSectionId);
		if (!section) {
			throw new Error(`Missing docdown section ${docSectionId} for ${entry.signature}.`);
		}

		return {
			...challenge,
			lodashVersion: config.version,
			order,
			markdown: section.markdown,
		};
	});
}
