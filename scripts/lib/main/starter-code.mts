import type { ChallengeParam, ChallengeReturn } from "./types.mts";

type StarterCodeOptions = {
	name: string;
	params: readonly ChallengeParam[];
	returns: ChallengeReturn | null;
};

export function createStarterCode({ name, params, returns }: StarterCodeOptions): string {
	const used = new Set<string>();
	const args = params
		.filter((param) => !cleanParamName(param.name).includes("."))
		.map((param) => {
			const isRest = param.type.startsWith("...");
			const base = cleanIdentifier(cleanParamName(param.name).replace(/^\.\.\./, ""));
			let value = base || "value";
			while (used.has(value)) value = `${value}Arg`;
			used.add(value);
			return `${isRest ? "..." : ""}${value}`;
		});

	return [
		"/**",
		...params.map((param) => ` * @param {${param.type}} ${param.name}`),
		` * @returns {${returns?.type || "*"}}`,
		" */",
		`function ${cleanIdentifier(name)}(${args.join(", ")}) {`,
		"  // Write your implementation here.",
		"}",
	].join("\n");
}

function cleanParamName(name: string): string {
	return String(name)
		.replace(/^\[|\]$/g, "")
		.split("=")[0];
}

function cleanIdentifier(value: string): string {
	const cleaned = String(value).replace(/[^\w$]/g, "");
	return /^[A-Za-z_$]/.test(cleaned) ? cleaned : `arg${cleaned}`;
}
