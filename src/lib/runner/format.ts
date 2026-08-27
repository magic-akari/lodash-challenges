export function formatInput(calls: unknown[][]): string {
	if (calls.length === 0) return "(not captured)";
	return stringify(calls.length === 1 ? calls[0] : calls);
}

export function stringify(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "function") return "[Function]";
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

export function formatThrown(error: unknown): string {
	return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
