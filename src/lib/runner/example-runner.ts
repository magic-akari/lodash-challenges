import lodash from "lodash";

import type { ChallengeRuntimeEntry, ExampleAssertion } from "../../domain/challenge";
import type { RunnerResponse } from "../../domain/runner";
import type { CandidateRun } from "./candidate";
import { formatInput, formatThrown, stringify } from "./format";

type ExampleCheckResult =
	| { ok: true }
	| {
			ok: false;
			expectedOutput: string;
			actualOutput: string;
	  };

const docGlobals = createDocGlobals();

export function runExamples(entry: ChallengeRuntimeEntry, candidateRun: CandidateRun): RunnerResponse {
	const failures: string[] = [];
	let total = 0;

	for (const example of entry.examples) {
		if (example.assertions.length === 0) {
			total += 1;
			candidateRun.takeCalls();
			try {
				runSnippet(example.code, candidateRun.candidate);
			} catch (error) {
				failures.push(
					formatExampleFailure(
						"Example smoke run failed",
						candidateRun.takeCalls(),
						"Completed without throwing",
						formatThrown(error),
					),
				);
			}
			continue;
		}

		for (const assertion of example.assertions) {
			total += 1;
			candidateRun.takeCalls();
			const result = runExampleAssertion(assertion, candidateRun.candidate);
			const input = candidateRun.takeCalls();
			if (result.ok) continue;
			failures.push(
				formatExampleFailure(
					`Example line ${assertion.line}`,
					input,
					result.expectedOutput,
					result.actualOutput,
				),
			);
		}
	}

	const summary = `${total - failures.length}/${total} example checks passed.`;
	if (failures.length === 0) {
		return {
			status: "passed",
			summary,
			failures: [],
		};
	}
	return {
		status: "failed",
		summary,
		failures,
	};
}

function runExampleAssertion(assertion: ExampleAssertion, candidate: typeof lodash): ExampleCheckResult {
	if (assertion.mode === "smoke") {
		try {
			runSnippet(assertion.code, candidate);
			return { ok: true };
		} catch (error) {
			return {
				ok: false,
				expectedOutput: "Completed without throwing",
				actualOutput: formatThrown(error),
			};
		}
	}

	let expected: unknown;
	try {
		expected = evaluateExpected(assertion.expected, candidate);
	} catch (error) {
		return {
			ok: false,
			expectedOutput: `Valid expected value from ${JSON.stringify(assertion.expected)}`,
			actualOutput: formatThrown(error),
		};
	}

	let actual: unknown;
	try {
		actual =
			assertion.mode === "console"
				? captureConsole(assertion.code, candidate).at(-1)
				: runSnippet(assertion.code, candidate);
	} catch (error) {
		return {
			ok: false,
			expectedOutput: stringify(expected),
			actualOutput: formatThrown(error),
		};
	}

	if (!lodash.isEqual(actual, expected)) {
		return {
			ok: false,
			expectedOutput: stringify(expected),
			actualOutput: stringify(actual),
		};
	}
	return { ok: true };
}

function formatExampleFailure(label: string, input: unknown[][], expectedOutput: string, actualOutput: string) {
	return [
		`${label}:`,
		`Input: ${formatInput(input)}`,
		`Expected output: ${expectedOutput}`,
		`Actual output: ${actualOutput}`,
	].join("\n");
}

function runSnippet(code: string, candidate: typeof lodash) {
	return new Function(
		"_",
		"globals",
		"with (globals) { return (function() {\n" + returnLastExpression(code) + "\n}()); }",
	)(candidate, docGlobals);
}

function evaluateExpected(expected: string, candidate: typeof lodash) {
	return new Function("_", "return (" + expected + ");")(candidate);
}

function captureConsole(code: string, candidate: typeof lodash) {
	const values: unknown[] = [];
	const globals = {
		...docGlobals,
		console: {
			log: (...args: unknown[]) => values.push(args.length <= 1 ? args[0] : args),
		},
	};
	new Function("_", "globals", "with (globals) { return (function() {\n" + code + "\n}()); }")(candidate, globals);
	return values;
}

function returnLastExpression(code: string) {
	const trimmed = code.trim().replace(/;\s*$/, "");
	if (!trimmed || /\breturn\b/.test(trimmed)) return code;

	const lastSemi = trimmed.lastIndexOf(";");
	if (lastSemi === -1) return `return (${trimmed});`;

	const prefix = trimmed.slice(0, lastSemi + 1);
	const last = trimmed.slice(lastSemi + 1).trim();
	if (!last || /^(?:var|let|const|if|for|while|switch|try|function)\b/.test(last)) return code;
	return `${prefix}\nreturn (${last});`;
}

function createDocGlobals() {
	const noop = () => undefined;
	const element = { cloneNode: () => ({ childNodes: [], nodeName: "BODY" }) };
	const document = {
		body: {
			childNodes: [],
			nodeName: "BODY",
			cloneNode: () => ({ childNodes: [], nodeName: "BODY" }),
		},
		querySelectorAll: () => [],
	};
	class EventSource {
		addEventListener() {}
	}
	const jQuery = () => ({
		on: (_eventName: string, callback?: Function) => callback?.(),
	});
	return {
		addContactToList: noop,
		asyncSave: ({ complete }: { complete?: Function } = {}) => complete?.(),
		batchLog: noop,
		calculateLayout: noop,
		createApplication: noop,
		data: { user: "mock" },
		document,
		element,
		EventSource,
		fs: { writeFileSync: noop },
		jQuery,
		mainText: "",
		path: {},
		process: {},
		renewToken: noop,
		sendMail: noop,
		setImmediate:
			(globalThis as Record<string, unknown>).setImmediate ||
			((callback: Function) => setTimeout(() => callback(), 0)),
		updatePosition: noop,
		window: {},
	};
}
