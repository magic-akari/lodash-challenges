import type { ChallengeRuntimeEntry } from "../../domain/challenge";
import type { RunnerRequest, RunnerResponse } from "../../domain/runner";
import { makeCandidate, type CandidateRun } from "./candidate";
import { formatThrown } from "./format";

type RunnerHandler = (
	entry: ChallengeRuntimeEntry,
	candidateRun: CandidateRun,
) => RunnerResponse | Promise<RunnerResponse>;

export function startRunnerWorker(run: RunnerHandler) {
	self.addEventListener("message", async (event: MessageEvent<RunnerRequest>) => {
		try {
			const { entry, code } = event.data;
			const candidateRun = makeCandidate(entry, code);
			const result = await run(entry, candidateRun);
			postMessage(result);
		} catch (error) {
			postMessage({
				status: "error",
				summary: "Runner setup failed.",
				failures: [formatThrown(error)],
			} satisfies RunnerResponse);
		}
	});
}
