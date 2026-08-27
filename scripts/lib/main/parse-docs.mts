import kebabCase from "lodash/kebabCase.js";

import { categoryOrder, unique } from "../common/util.mts";
import { toExample } from "./examples.mts";
import { createStarterCode } from "./starter-code.mts";
import { parseJsDoc } from "./jsdoc.mts";
import type { ChallengeSourceEntry } from "../../../src/domain/challenge.ts";
import type { LodashContentConfig } from "./content-config.mts";
import type { DoctrineTypeNode, JsDocAnnotation, JsDocTag } from "./jsdoc.mts";
import type { ChallengeParam, ChallengeReturn, ModuleIdsByName } from "./types.mts";

export function parseChallengeEntries(
	source: string,
	moduleIdsByName: ModuleIdsByName,
	config: LodashContentConfig,
): ChallengeSourceEntry[] {
	return getEntries(source)
		.map((entryText) => toEntry(entryText, moduleIdsByName))
		.filter(isChallengeEntry)
		.sort(
			(a, b) =>
				categoryOrder(a.category, config.categoryOrder) - categoryOrder(b.category, config.categoryOrder) ||
				a.name.localeCompare(b.name),
		);
}

export function dedupeSlugs(entries: readonly ChallengeSourceEntry[]): ChallengeSourceEntry[] {
	const seen = new Set<string>();
	return entries.map((entry) => {
		if (!seen.has(entry.slug)) {
			seen.add(entry.slug);
			return entry;
		}

		const suffix = entry.category === "Seq" || entry.kind === "method" ? "method" : "variant";
		let slug = `${entry.slug}-${suffix}`;
		let index = 2;
		while (seen.has(slug)) {
			slug = `${entry.slug}-${suffix}-${index++}`;
		}
		seen.add(slug);
		return {
			...entry,
			route: problemRoute(slug),
			slug,
		};
	});
}

function isChallengeEntry(entry: ChallengeSourceEntry | null): entry is ChallengeSourceEntry {
	return entry !== null;
}

function problemRoute(slug: string): `/problems/${string}/` {
	return `/problems/${slug}/`;
}

function toEntry(entryText: string, moduleIdsByName: ModuleIdsByName): ChallengeSourceEntry | null {
	const comment = entryText.match(/\/\*\*[\s\S]*?\*\//)?.[0];
	if (!comment) return null;

	const parsed = parseJsDoc(comment.replace(/@param-/g, "@privateParam"));

	if (isPrivate(parsed)) return null;

	const publicParams = getParams(parsed, "param");
	const internalParams = getInternalParams(comment);
	const returns = getReturns(parsed);
	if (!isFunctionEntry(entryText, parsed, publicParams, returns)) return null;

	const name = getName(entryText, parsed);
	if (!name || name === "_") return null;

	const category = getTagValue(parsed, "category") || "Methods";
	if (category === "Properties") return null;

	const member = getEntryMember(parsed, category);
	if (!(member === "_" || member === "_.prototype")) return null;

	const fullName = member === "_" ? name : `prototype.${name}`;
	const slug = kebabCase(name);
	const moduleIds = unique([...(moduleIdsByName[name] || []), ...(moduleIdsByName[fullName] || [])]);
	const allStarterParams = [...publicParams, ...internalParams];
	const call = getCall(entryText, parsed, publicParams);

	return {
		id: getHash(member, name),
		docSectionId: getDocSectionId(member, name),
		slug,
		route: problemRoute(slug),
		name,
		fullName,
		category,
		kind: member === "_" ? "function" : "method",
		signature: getSignature(member, name, call),
		starterCode: createStarterCode({
			name,
			params: allStarterParams,
			returns,
		}),
		examples: getTags(parsed, "example").map((tag) => toExample(String(tag.description || tag.name || ""))),
		aliases: splitAliases(getTagValue(parsed, "alias")),
		testModuleIds: moduleIds,
	};
}

function getEntries(source: string): string[] {
	return String(source).match(/\/\*\*(?![-!])[\s\S]*?\*\/\s*.+/g) || [];
}

function firstMember(parsed: JsDocAnnotation): string {
	return (
		String(getTagValue(parsed, "member") || getTagValue(parsed, "memberOf") || "")
			.split(/,\s*/)
			.filter(Boolean)[0] || ""
	);
}

function getEntryMember(parsed: JsDocAnnotation, category: string): string {
	const member = firstMember(parsed);
	if (member === "_" && category === "Seq" && !hasTag(parsed, "static")) {
		return "_.prototype";
	}
	return member;
}

function isPrivate(parsed: JsDocAnnotation): boolean {
	return hasTag(parsed, "license") || hasTag(parsed, "private") || parsed.tags.length === 0;
}

function isFunctionEntry(
	entryText: string,
	parsed: JsDocAnnotation,
	params: readonly ChallengeParam[],
	returns: ChallengeReturn | null,
): boolean {
	return Boolean(
		hasTag(parsed, "function") ||
			hasTag(parsed, "constructor") ||
			params.length ||
			returns ||
			/\*\/\s*(?:function\s+)?[^\s(]+\s*\(/.test(entryText),
	);
}

function getName(entryText: string, parsed: JsDocAnnotation): string {
	return getTagValue(parsed, "name") || String(getCall(entryText, parsed, [])).split("(")[0];
}

function getCall(entryText: string, parsed: JsDocAnnotation, params: readonly ChallengeParam[]): string {
	let result = entryText.match(/\*\/\s*(?:function\s+)?([^\s(]+)\s*\(/)?.[1]?.trim();
	if (!result) {
		result = entryText.match(/\*\/\s*(.*?)[:=,]/)?.[1]?.trim() || "";
		result = /['"]$/.test(result)
			? result.replace(/^['"]|['"]$/g, "")
			: (result.split(".").pop() || "").replace(/^(?:const|let|var)\s+/, "");
	}
	const name = getTagValue(parsed, "name") || result;
	const visibleParams: string[] = [];

	for (const param of params) {
		const baseName = param.name.replace(/^\[|\]$/g, "").split("=")[0];
		const parent = baseName.match(/\w+(?=\.[\w.]+)/)?.[0];
		if (!parent) visibleParams.push(param.name);
	}

	return `${name}(${visibleParams.join(", ")})`;
}

function getSignature(member: string, name: string, call: string): string {
	if (member === "_") return `_.${call}`;
	if (name.startsWith("Symbol.")) {
		return `_.prototype[${name}](${call.slice(name.length + 1)}`;
	}
	return `_.prototype.${call}`;
}

function getParams(parsed: JsDocAnnotation, tagName: string): ChallengeParam[] {
	return getTags(parsed, tagName)
		.filter((tag) => tag.name)
		.map((tag) => {
			let name = String(tag.name);
			if (tag.default != null) name += `=${tag.default}`;
			if (tag.type?.type === "OptionalType") name = `[${name}]`;
			return {
				name,
				type: getParamType(tag.type),
			};
		});
}

function getInternalParams(comment: string): ChallengeParam[] {
	const params: ChallengeParam[] = [];
	const unwrapped = String(comment)
		.replace(/^\/\*\*|\*\/$/g, "")
		.replace(/^\s*\*\s?/gm, "");
	const regex = /@param-\s+\{([^}]+)\}\s+(\[[^\]]+\]|\S+)\s+([^\n]*)/g;
	for (const match of unwrapped.matchAll(regex)) {
		const type = match[1];
		const name = match[2];
		if (!type || !name) continue;
		params.push({
			type,
			name,
		});
	}
	return params;
}

function getReturns(parsed: JsDocAnnotation): ChallengeReturn | null {
	const tag = getTags(parsed, "returns")[0];
	if (!tag) return null;
	return {
		type: getParamType(tag.type) || "*",
	};
}

function getParamType(tag: DoctrineTypeNode | null | undefined): string {
	if (!tag) return "*";
	let result = "";
	switch (tag.type) {
		case "AllLiteral":
			result = "*";
			break;
		case "NameExpression":
			result = String(tag.name);
			break;
		case "RestType":
			result = `...${getParamType(tag.expression)}`;
			break;
		case "TypeApplication":
			result = (tag.applications || [])
				.map((item) => `${getParamType(item)}[]`)
				.sort()
				.join("|");
			break;
		case "UnionType":
			result = `(${(tag.elements || []).map(getParamType).sort().join("|")})`;
			break;
	}
	if (tag.expression && tag.type !== "RestType") result += getParamType(tag.expression);
	return result;
}

function splitAliases(value: string): string[] {
	return String(value || "")
		.split(/,\s*/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function getTagValue(parsed: JsDocAnnotation, title: string): string {
	const tag = getTags(parsed, title)[0];
	if (!tag) return "";
	if (title === "alias") return tag.name || tag.description || "";
	if (title === "type") return tag.type?.name || "";
	return tag.name || tag.description || "";
}

function getTags(parsed: JsDocAnnotation, title: string): JsDocTag[] {
	return parsed.tags.filter((tag) => tag.title === title);
}

function hasTag(parsed: JsDocAnnotation, title: string): boolean {
	return getTags(parsed, title).length > 0;
}

function getHash(member: string, name: string): string {
	const prefix = member === "_" ? "" : `${member.replace(/^_\./, "").replace(/\./g, "-")}-`;
	return `${prefix}${name}`.replace(/^_-/, "");
}

function getDocSectionId(member: string, name: string): string {
	const prefix = member === "_" ? "" : `${member.replace(/^_\./, "").replace(/\./g, "-")}-`;
	return `${prefix}${name}`.replace(/\./g, "-").replace(/^_-/, "");
}
