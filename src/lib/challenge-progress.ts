const STORAGE_PREFIX = "lodash-challenges:v1";

export const ACCEPTED_PROBLEM_IDS_KEY = `${STORAGE_PREFIX}:accepted-problem-ids`;
export const CHALLENGE_PROGRESS_UPDATED_EVENT = "lodash-challenges:progress-updated";

export function getAcceptedProblemIds(): Set<string> {
	const value = readStorage(ACCEPTED_PROBLEM_IDS_KEY);
	if (value === null) return new Set();

	try {
		const parsed: unknown = JSON.parse(value);
		if (!Array.isArray(parsed)) return new Set();
		return new Set(parsed.filter((problemId): problemId is string => typeof problemId === "string"));
	} catch {
		return new Set();
	}
}

export function getLatestSubmission(problemId: string): string | null {
	return readStorage(latestSubmissionKey(problemId));
}

export function getAcceptedSolution(problemId: string): string | null {
	return readStorage(acceptedSolutionKey(problemId));
}

export function saveLatestSubmission(problemId: string, code: string): boolean {
	return writeStorage(latestSubmissionKey(problemId), code);
}

export function saveAcceptedSolution(problemId: string, code: string): boolean {
	const solutionKey = acceptedSolutionKey(problemId);
	const previousSolution = readStorage(solutionKey);
	try {
		const acceptedProblemIds = getAcceptedProblemIds();
		window.localStorage.setItem(solutionKey, code);
		if (!acceptedProblemIds.has(problemId)) {
			acceptedProblemIds.add(problemId);
			window.localStorage.setItem(ACCEPTED_PROBLEM_IDS_KEY, JSON.stringify([...acceptedProblemIds]));
		}
	} catch {
		restoreStorage(solutionKey, previousSolution);
		return false;
	}

	try {
		window.dispatchEvent(
			new CustomEvent(CHALLENGE_PROGRESS_UPDATED_EVENT, {
				detail: { problemId },
			}),
		);
	} catch {}
	return true;
}

function latestSubmissionKey(problemId: string): string {
	return `${STORAGE_PREFIX}:problem:${problemId}:latest-submission`;
}

function acceptedSolutionKey(problemId: string): string {
	return `${STORAGE_PREFIX}:problem:${problemId}:accepted-solution`;
}

function restoreStorage(key: string, value: string | null): void {
	try {
		if (value === null) {
			window.localStorage.removeItem(key);
		} else {
			window.localStorage.setItem(key, value);
		}
	} catch {}
}

function readStorage(key: string): string | null {
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorage(key: string, value: string): boolean {
	try {
		window.localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}
