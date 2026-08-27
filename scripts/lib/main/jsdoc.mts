import { parse } from "doctrine";
import type { Tag, Type as DoctrineType } from "doctrine";

export type DoctrineTypeNode = DoctrineType & {
	applications?: DoctrineTypeNode[];
	elements?: DoctrineTypeNode[];
	expression?: DoctrineTypeNode;
	name?: string;
};

export type JsDocTag = Omit<Tag, "type"> & {
	default?: string | number | boolean;
	type?: DoctrineTypeNode | null;
};

export type JsDocAnnotation = {
	description: string;
	tags: JsDocTag[];
};

export const DOCDOWN_DOCTRINE_OPTIONS = {
	lineNumbers: true,
	recoverable: true,
	sloppy: true,
	unwrap: true,
} as const;

export function parseJsDoc(comment: string): JsDocAnnotation {
	return parse(comment, DOCDOWN_DOCTRINE_OPTIONS) as JsDocAnnotation;
}
