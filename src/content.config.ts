import { defineCollection } from "astro:content";
import { z } from "astro/zod";

import { createLodashContentConfig } from "../scripts/lib/main/content-config.mts";
import { loadChallengeContent } from "../scripts/lib/main/load-challenge-content.mts";

const exampleAssertionSchema = z.object({
	line: z.number(),
	mode: z.enum(["return", "console", "smoke"]),
	code: z.string(),
	expected: z.string(),
});

const challengeExampleSchema = z.object({
	code: z.string(),
	assertions: z.array(exampleAssertionSchema),
});

const challengeEntrySchema = z.object({
	id: z.string(),
	slug: z.string(),
	route: z
		.string()
		.regex(/^\/problems\/[^/]+\/$/)
		.transform((route) => route as `/problems/${string}/`),
	name: z.string(),
	fullName: z.string(),
	category: z.string(),
	kind: z.enum(["function", "method"]),
	signature: z.string(),
	starterCode: z.string(),
	examples: z.array(challengeExampleSchema),
	aliases: z.array(z.string()),
	testModuleIds: z.array(z.string()),
	lodashVersion: z.string(),
	order: z.number(),
});

const problems = defineCollection({
	type: "content_layer",
	schema: challengeEntrySchema,
	loader: {
		name: "lodash-problems",
		async load({ store, parseData, renderMarkdown, generateDigest }) {
			store.clear();
			const entries = await loadChallengeContent(createLodashContentConfig());

			for (const entry of entries) {
				const { markdown, ...data } = entry;
				const parsedData = await parseData({ id: data.slug, data });
				const rendered = await renderMarkdown(markdown);

				store.set({
					id: data.slug,
					data: parsedData,
					body: markdown,
					rendered,
					digest: generateDigest({ data: parsedData, markdown }),
				});
			}
		},
	},
});

export const collections = { problems };
