export type ChallengeParam = {
	name: string;
	type: string;
};

export type ChallengeReturn = {
	type: string;
};

export type DocdownSection = {
	id: string;
	signature: string;
	markdown: string;
};

export type ModuleIdsByName = Record<string, string[]>;

export type OfficialTestModule = {
	id: string;
	source: string;
};
