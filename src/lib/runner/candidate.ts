import lodash from "lodash";

import type { ChallengeRuntimeEntry } from "../../domain/challenge";

export type CandidateRun = {
	candidate: typeof lodash;
	takeCalls: () => unknown[][];
};

export function makeCandidate(entry: ChallengeRuntimeEntry, code: string): CandidateRun {
	const base = lodash.runInContext ? lodash.runInContext() : lodash;
	const module = { exports: {} as unknown };
	const exports = module.exports;
	const calls: unknown[][] = [];
	const factory = new Function(
		"module",
		"exports",
		`"use strict";\n${code}\nreturn typeof ${entry.name} === "function" ? ${entry.name} : (module.exports && (module.exports.default || module.exports));`,
	);
	const implementation = factory(module, exports);
	if (typeof implementation !== "function") {
		throw new TypeError("Your code must define a function named " + entry.name + ".");
	}

	const trackedImplementation = new Proxy(implementation, {
		apply(target, thisArgument, argumentsList) {
			calls.push(lodash.cloneDeep(argumentsList));
			return Reflect.apply(target, thisArgument, argumentsList);
		},
	});

	const candidate = base as unknown as Record<string, unknown>;
	candidate[entry.name] = trackedImplementation;
	for (const alias of entry.aliases) {
		candidate[alias] = trackedImplementation;
	}
	if (typeof base.mixin === "function") {
		base.mixin({ [entry.name]: trackedImplementation });
	}

	return {
		candidate: base,
		takeCalls: () => calls.splice(0),
	};
}
