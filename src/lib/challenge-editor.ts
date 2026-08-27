import { acceptCompletion, autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";

import type { ChallengeRuntimeEntry } from "../domain/challenge";
import {
	isRunnerResponse,
	RUNNER_TIMEOUT_MS,
	type RunnerMode,
	type RunnerRequest,
	type RunnerResponse,
} from "../domain/runner";
import { getLatestSubmission, saveAcceptedSolution, saveLatestSubmission } from "./challenge-progress";

const mounted = new WeakSet<Element>();

export function mountChallengeEditors() {
	for (const shell of document.querySelectorAll(".challenge-shell")) {
		if (mounted.has(shell)) continue;
		mounted.add(shell);
		mountChallengeEditor(shell as HTMLElement);
	}
}

function mountChallengeEditor(shell: HTMLElement) {
	const dataNode = shell.querySelector<HTMLScriptElement>(".challenge-data");
	const host = shell.querySelector<HTMLElement>("[data-editor-host]");
	const output = shell.querySelector<HTMLOutputElement>("[data-runner-output]");
	const runButton = shell.querySelector<HTMLButtonElement>("[data-run-examples]");
	const checkButton = shell.querySelector<HTMLButtonElement>("[data-check-tests]");
	if (!dataNode || !host || !output || !runButton || !checkButton) return;
	const problemId = shell.dataset.problemId || "";
	if (!problemId) return;
	const challengeEntry = JSON.parse(dataNode.textContent || "{}") as ChallengeRuntimeEntry;
	const outputNode = output;
	const runButtonNode = runButton;
	const checkButtonNode = checkButton;
	const initialCode = getLatestSubmission(problemId) ?? challengeEntry.starterCode;

	const state = EditorState.create({
		doc: initialCode,
		extensions: [
			lineNumbers(),
			history(),
			drawSelection(),
			indentOnInput(),
			bracketMatching(),
			highlightActiveLine(),
			syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
			keymap.of([{ key: "Tab", run: acceptCompletion }, ...defaultKeymap, ...historyKeymap]),
			javascript(),
			autocompletion(),
			EditorView.lineWrapping,
			EditorView.theme({
				"&": {
					fontSize: "16px",
				},
				".cm-scroller": {
					overflow: "auto",
				},
				".cm-content": {
					minHeight: "10lh",
					"padding-inline": "14px",
				},
				".cm-gutter": {
					minHeight: "10lh",
				},
				".cm-gutters": {
					backgroundColor: "#f7f7f7",
					borderRight: "1px solid #dcdcdc",
				},
			}),
		],
	});

	const view = new EditorView({ parent: host, state });

	runButtonNode.addEventListener("click", () => run("examples"));
	checkButtonNode.addEventListener("click", () => run("official"));

	async function run(mode: RunnerMode) {
		const code = view.state.doc.toString();
		if (mode === "official") {
			saveLatestSubmission(problemId, code);
		}

		runButtonNode.disabled = true;
		checkButtonNode.disabled = true;
		outputNode.value = mode === "examples" ? "Running examples..." : "Checking official tests...";
		try {
			const result = await runWorker(mode, challengeEntry, code);
			outputNode.value = formatResult(result);
			if (mode === "official" && result.status === "passed") {
				if (saveAcceptedSolution(problemId, code)) {
					const { launchSuccessConfetti } = await import("./challenge-celebration");
					launchSuccessConfetti();
				}
			}
		} catch (error) {
			outputNode.value = error instanceof Error ? error.message : String(error);
		} finally {
			runButtonNode.disabled = false;
			checkButtonNode.disabled = false;
		}
	}
}

function runWorker(mode: RunnerMode, entry: ChallengeRuntimeEntry, code: string): Promise<RunnerResponse> {
	return new Promise((resolve, reject) => {
		const worker = createWorker(mode);
		const timeout = window.setTimeout(() => {
			worker.terminate();
			reject(new Error(`Timed out after ${RUNNER_TIMEOUT_MS}ms.`));
		}, RUNNER_TIMEOUT_MS);

		worker.addEventListener("message", (event: MessageEvent<unknown>) => {
			window.clearTimeout(timeout);
			worker.terminate();
			if (!isRunnerResponse(event.data)) {
				reject(new Error("Worker returned an invalid response."));
				return;
			}
			resolve(event.data);
		});
		worker.addEventListener("error", (event) => {
			window.clearTimeout(timeout);
			worker.terminate();
			reject(new Error(event.message || "Worker failed."));
		});
		worker.postMessage({ mode, entry, code } satisfies RunnerRequest);
	});
}

function createWorker(mode: RunnerMode): Worker {
	if (mode === "examples") {
		return new Worker(new URL("./example-worker.ts", import.meta.url), { type: "module" });
	}
	return new Worker(new URL("./official-worker.ts", import.meta.url), { type: "module" });
}

function formatResult(result: RunnerResponse) {
	const icon = {
		passed: "PASS",
		failed: "FAIL",
		unavailable: "UNAVAILABLE",
		error: "ERROR",
	}[result.status];
	const details = result.failures.length ? `\n\n${result.failures.join("\n")}` : "";
	return `${icon} ${result.summary}${details}`;
}
