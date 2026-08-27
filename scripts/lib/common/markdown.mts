export function normalizeExample(raw: string): string {
	return String(raw)
		.replace(/^\s*\n/, "")
		.replace(/\n\s*$/, "")
		.replace(/^\s{0,4}/gm, "");
}
