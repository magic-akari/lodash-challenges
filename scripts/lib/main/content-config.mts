import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export type LodashContentConfig = {
	categoryOrder: string[];
	lodashSourcePath: string;
	officialTestPath: string;
	version: string;
};

export type CreateLodashContentConfigOptions = {
	root?: string;
	version?: string;
};

const DEFAULT_LODASH_VERSION = "4.18.1";
const LODASH_SOURCE_PACKAGE = "lodash-source";

const CATEGORY_ORDER = [
	"Array",
	"Collection",
	"Date",
	"Function",
	"Lang",
	"Math",
	"Number",
	"Object",
	"Seq",
	"String",
	"Util",
	"Methods",
];

export function createLodashContentConfig({
	root = process.cwd(),
	version,
}: CreateLodashContentConfigOptions = {}): LodashContentConfig {
	const sourcePackage = resolveLodashSourcePackage(root);
	const lodashVersion = version || sourcePackage.version || DEFAULT_LODASH_VERSION;
	if (sourcePackage.version && sourcePackage.version !== lodashVersion) {
		throw new Error(
			`Configured lodash version ${lodashVersion} does not match ${LODASH_SOURCE_PACKAGE} ${sourcePackage.version}. Update the ${LODASH_SOURCE_PACKAGE} dependency tag or remove LODASH_VERSION.`,
		);
	}
	return {
		categoryOrder: CATEGORY_ORDER,
		lodashSourcePath: path.join(sourcePackage.root, "lodash.js"),
		officialTestPath: path.join(sourcePackage.root, "test", "test.js"),
		version: lodashVersion,
	};
}

function resolveLodashSourcePackage(root: string): {
	root: string;
	version: string;
} {
	const resolveFromRoot = createRequire(path.join(root, "package.json"));
	const packagePath = resolveFromRoot.resolve(`${LODASH_SOURCE_PACKAGE}/package.json`);
	const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
		version?: string;
	};
	return {
		root: path.dirname(packagePath),
		version: packageJson.version || "",
	};
}
