export type ExampleAssertion = {
	line: number;
	mode: "return" | "console" | "smoke";
	code: string;
	expected: string;
};

export type ChallengeExample = {
	code: string;
	assertions: ExampleAssertion[];
};

export type ChallengeEntry = {
	id: string;
	slug: string;
	route: `/problems/${string}/`;
	name: string;
	fullName: string;
	category: string;
	kind: "function" | "method";
	signature: string;
	starterCode: string;
	examples: ChallengeExample[];
	aliases: string[];
	testModuleIds: string[];
	lodashVersion: string;
	order: number;
};

export type ChallengeRuntimeEntry = Pick<
	ChallengeEntry,
	"name" | "aliases" | "starterCode" | "examples" | "testModuleIds"
>;

export type ChallengeSourceEntry = Omit<ChallengeEntry, "lodashVersion" | "order"> & {
	docSectionId: string;
};

export type ChallengeContentEntry = ChallengeEntry & {
	markdown: string;
};
