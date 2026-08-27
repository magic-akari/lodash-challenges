import docdown from "docdown";

import type { LodashContentConfig } from "./content-config.mts";
import type { DocdownSection } from "./types.mts";

type LodashDocdownOptions = Parameters<typeof docdown>[0] & {
	entryLink: string;
	sourceLink: string;
	tocHref: string;
	tocLink: string;
	sublinks: string[];
};

export function buildDocdownMarkdown(config: LodashContentConfig): string {
	const options: LodashDocdownOptions = {
		path: config.lodashSourcePath,
		title: `<a href="https://lodash.com/">lodash</a> <span>v${config.version}</span>`,
		toc: "categories",
		url: `https://github.com/lodash/lodash/blob/${config.version}/lodash.js`,
		entryLink: "",
		sourceLink: "",
		tocHref: "",
		tocLink: "",
		sublinks: [],
	};

	return postprocess(docdown(options));
}

export function splitDocdownSections(markdown: string): DocdownSection[] {
	const source = String(markdown);
	const headingPattern = /^<h3 id="([^"]+)"><code>([\s\S]*?)<\/code><\/h3>\s*$/gm;
	const headings = [...source.matchAll(headingPattern)];

	return headings.map((heading, index) => {
		const start = heading.index ?? 0;
		const end = headings[index + 1]?.index ?? source.length;
		const signature = decodeHtml(heading[2] || "");

		return {
			id: heading[1] || "",
			signature,
			markdown: cleanSectionMarkdown(source.slice(start, end)),
		};
	});
}

export function indexSectionsById(sections: readonly DocdownSection[]): Map<string, DocdownSection> {
	const index = new Map<string, DocdownSection>();
	for (const section of sections) {
		if (index.has(section.id)) {
			throw new Error(`Expected a unique docdown section id, found duplicate ${section.id}.`);
		}
		index.set(section.id, section);
	}
	return index;
}

function cleanSectionMarkdown(markdown: string): string {
	return String(markdown)
		.replace(/^\[source\]\([^)]+\)\s*$/gm, "")
		.replace(/^\[[^\]]*npm package[^\]]*\]\([^)]+\)\s*$/gim, "")
		.replace(/^---\s*$/gm, "")
		.replace(/^<!-- \/?div(?: class="[^"]+")? -->\s*$/gm, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function decodeHtml(value: string): string {
	return String(value)
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function postprocess(markdown: string): string {
	return String(markdown).replace(/\.(Symbol\.(?:[a-z]+[A-Z]?)+)/g, "[$1]");
}
