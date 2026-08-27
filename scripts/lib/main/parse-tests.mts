import { buildModuleIndex } from "./test-mapping.mts";
import type { ModuleIdsByName, OfficialTestModule } from "./types.mts";

export function parseOfficialTests(source: string): {
	moduleIdsByName: ModuleIdsByName;
	testModules: OfficialTestModule[];
} {
	const testModules = parseQUnitModules(source);
	return {
		moduleIdsByName: buildModuleIndex(testModules),
		testModules,
	};
}

function parseQUnitModules(source: string): OfficialTestModule[] {
	const matches = [...source.matchAll(/QUnit\.module\(([^;\n]+)\);/g)];
	return matches.map((match, index) => {
		const expr = (match[1] || "").trim();
		const literal = expr.match(/^['"]([\s\S]*?)['"]$/);
		return {
			id: literal?.[1] || expr,
			source: source.slice(match.index ?? 0, matches[index + 1]?.index ?? source.length),
		};
	});
}
