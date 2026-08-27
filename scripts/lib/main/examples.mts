import { normalizeExample } from "../common/markdown.mts";
import type { ChallengeExample, ExampleAssertion } from "../../../src/domain/challenge.ts";

export function toExample(raw: string): ChallengeExample {
	const code = normalizeExample(raw);
	const assertions: ExampleAssertion[] = [];
	const lines = code.split("\n");
	let pending: string[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const match = line.match(/^\s*\/\/\s*=>\s*(.*)$/);
		if (match) {
			const snippet = pending.join("\n").trim();
			const expected = match[1].trim();
			assertions.push({
				line: index + 1,
				mode: /console\.log\s*\(/.test(snippet)
					? "console"
					: isEvaluableExpected(expected)
						? "return"
						: "smoke",
				code: snippet,
				expected,
			});
			pending = [];
		} else {
			pending.push(line);
		}
	}

	return {
		code,
		assertions,
	};
}

function isEvaluableExpected(expected: string): boolean {
	if (!expected || /^Logs\b|^Allows\b/.test(expected)) return false;
	try {
		Function(`return (${expected});`);
		return true;
	} catch {
		return false;
	}
}
