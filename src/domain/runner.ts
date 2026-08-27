import type { ChallengeRuntimeEntry } from "./challenge";

export const OFFICIAL_TEST_TIMEOUT_MS = 2500;
export const RUNNER_TIMEOUT_MS = OFFICIAL_TEST_TIMEOUT_MS + 500;

export type RunnerMode = "examples" | "official";

export type RunnerRequest = {
	mode: RunnerMode;
	entry: ChallengeRuntimeEntry;
	code: string;
};

type RunnerBaseResponse = {
	summary: string;
};

export type RunnerResponse =
	| (RunnerBaseResponse & {
			status: "passed" | "unavailable";
			failures: [];
	  })
	| (RunnerBaseResponse & {
			status: "failed" | "error";
			failures: string[];
	  });

type UnknownRunnerResponse = {
	status?: unknown;
	summary?: unknown;
	failures?: unknown;
};

function hasValidFailures(response: UnknownRunnerResponse): response is UnknownRunnerResponse & {
	failures: string[];
} {
	return Array.isArray(response.failures) && response.failures.every((failure) => typeof failure === "string");
}

export function isRunnerResponse(value: unknown): value is RunnerResponse {
	if (typeof value !== "object" || value === null) return false;

	const response = value as UnknownRunnerResponse;
	if (typeof response.summary !== "string" || !hasValidFailures(response)) return false;

	if (response.status === "passed" || response.status === "unavailable") {
		return response.failures.length === 0;
	}
	return response.status === "failed" || response.status === "error";
}
