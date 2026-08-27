import { unique } from "../common/util.mts";
import { inferOfficialMethodNames } from "./official-test-methods.mts";
import type { ModuleIdsByName, OfficialTestModule } from "./types.mts";

export function buildModuleIndex(modules: readonly OfficialTestModule[]): ModuleIdsByName {
	const index: ModuleIdsByName = Object.create(null);
	for (const module of modules) {
		for (const name of namesForModule(module)) {
			index[name] = unique([...(index[name] || []), module.id]);
		}
	}
	return index;
}

function namesForModule(module: OfficialTestModule): string[] {
	const direct = module.id.match(/^lodash\.([A-Za-z_$][\w$]*)$/);
	if (direct?.[1]) return [direct[1]];
	const combined = [...module.id.matchAll(/lodash\.([A-Za-z_$][\w$]*)/g)]
		.map((match) => match[1])
		.filter((name): name is string => Boolean(name));
	return unique([...combined, ...inferOfficialMethodNames(module.source)]);
}
