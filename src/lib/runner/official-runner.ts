import lodash from "lodash";
import QUnit from "qunit";
import officialTestSource from "lodash-source/test/test.js?raw";

import type { ChallengeRuntimeEntry } from "../../domain/challenge";
import { OFFICIAL_TEST_TIMEOUT_MS, type RunnerResponse } from "../../domain/runner";
import type { CandidateRun } from "./candidate";
import { formatInput, stringify } from "./format";

QUnit.config.autostart = false;

export async function runOfficialTests(
	entry: ChallengeRuntimeEntry,
	candidateRun: CandidateRun,
): Promise<RunnerResponse> {
	const selected = new Set(entry.testModuleIds);
	if (selected.size === 0) {
		return {
			status: "unavailable",
			summary: "No official test module is mapped for this problem yet.",
			failures: [],
		};
	}

	let firstFailure: string | null = null;
	let lastInput: unknown[][] = [];
	let passedBeforeFailure = 0;
	let passedTests = 0;
	let totalTests = 0;
	const stopAfterFirstFailure = new Error("Stopped after first failed assertion.");
	const done = new Promise<RunnerResponse>((resolve) => {
		QUnit.begin((details) => {
			const modules = details.modules as Array<{ name: string; tests?: unknown[] }>;
			totalTests = modules
				.filter((module) => selected.has(module.name))
				.reduce((total, module) => total + (module.tests?.length || 0), 0);
		});
		QUnit.testStart(() => {
			candidateRun.takeCalls();
			lastInput = [];
		});
		QUnit.testDone((details) => {
			if (details.failed === 0) {
				passedTests += 1;
			}
		});
		QUnit.log((details) => {
			if (firstFailure !== null) return;

			const currentInput = candidateRun.takeCalls();
			if (currentInput.length > 0) {
				lastInput = currentInput;
			}
			if (details.result) {
				passedBeforeFailure += 1;
				return;
			}

			firstFailure = formatQUnitFailure(details, lastInput);
			clearPendingQUnitTests();
			throw stopAfterFirstFailure;
		});
		QUnit.done((details) => {
			const stoppedEarly = firstFailure !== null;
			const failed = stoppedEarly || details.failed > 0;
			const summary = stoppedEarly
				? `${passedTests}/${totalTests} official tests passed; ${passedBeforeFailure} check(s) passed before the first failure.`
				: `${passedTests}/${totalTests} official tests passed (${details.passed}/${details.total} checks).`;
			if (failed) {
				resolve({
					status: "failed",
					summary,
					failures: firstFailure === null ? [] : [firstFailure],
				});
				return;
			}
			resolve({
				status: "passed",
				summary,
				failures: [],
			});
		});
	});

	const previous = snapshotGlobals();
	try {
		Object.assign(QUnit.config, {
			asyncRetries: 10,
			hidepassed: true,
			noglobals: true,
			testFilter: ({ module }: { module: string }) => selected.has(module),
			testTimeout: OFFICIAL_TEST_TIMEOUT_MS,
		});
		Object.assign(globalThis, {
			QUnit,
			_: candidateRun.candidate,
			lodashStable: lodash.runInContext ? lodash.runInContext() : lodash,
			ui: {
				buildPath: "lodash.js",
				loaderPath: "",
				isModularize: false,
				isStrict: false,
				urlParams: {},
			},
			phantom: undefined,
			define: undefined,
			Worker: undefined,
			document: undefined,
			process: undefined,
		});

		new Function("require", "module", "exports", officialTestSource).call(
			globalThis,
			undefined,
			undefined,
			undefined,
		);
		return await done;
	} finally {
		restoreGlobals(previous);
	}
}

function clearPendingQUnitTests() {
	const config = QUnit.config as typeof QUnit.config & { queue: unknown[] };
	config.queue.length = 0;
}

function formatQUnitFailure(details: QUnit.LogDetails, input: unknown[][]) {
	const location = `${details.module} / ${details.name}`;
	const message = (details.message || "failed").split("\n")[0];
	return [
		`${location}: ${message}`,
		`Input: ${formatInput(input)}`,
		`Expected output: ${stringify(details.expected)}`,
		`Actual output: ${stringify(details.actual)}`,
	].join("\n");
}

function snapshotGlobals() {
	return {
		QUnit: (globalThis as Record<string, unknown>).QUnit,
		_: (globalThis as Record<string, unknown>)._,
		lodashStable: (globalThis as Record<string, unknown>).lodashStable,
		ui: (globalThis as Record<string, unknown>).ui,
		phantom: (globalThis as Record<string, unknown>).phantom,
		define: (globalThis as Record<string, unknown>).define,
		Worker: (globalThis as Record<string, unknown>).Worker,
		document: (globalThis as Record<string, unknown>).document,
		process: (globalThis as Record<string, unknown>).process,
	};
}

function restoreGlobals(snapshot: Record<string, unknown>) {
	for (const key of Object.keys(snapshot)) {
		if (snapshot[key] === undefined) {
			delete (globalThis as Record<string, unknown>)[key];
		} else {
			(globalThis as Record<string, unknown>)[key] = snapshot[key];
		}
	}
}
