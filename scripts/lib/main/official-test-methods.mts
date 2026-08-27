import ts from "typescript";

import { unique } from "../common/util.mts";

type StringEnvironment = Map<string, string[]>;

/**
 * Official shared test modules express their subjects either as `_[methodName]`
 * or as a `lodashStable.each` callback named `methodName`.
 * Resolve only those data flows so helper calls inside a test are not mistaken
 * for the method under test.
 */
export function inferOfficialMethodNames(source: string): string[] {
	const sourceFile = ts.createSourceFile(
		"lodash-official-test-module.js",
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.JS,
	);
	const methodNames: string[] = [];
	visitNode(sourceFile, new Map(), methodNames);
	return unique(methodNames);
}

function visitNode(node: ts.Node, environment: StringEnvironment, methodNames: string[]) {
	if (ts.isVariableDeclaration(node)) {
		visitOptionalNode(node.initializer, environment, methodNames);
		setIdentifierValues(node.name, evaluateStrings(node.initializer, environment), environment);
		return;
	}

	if (ts.isBinaryExpression(node) && isAssignment(node.operatorToken.kind)) {
		visitNode(node.right, environment, methodNames);
		const right = evaluateStrings(node.right, environment);
		const assigned =
			node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken && ts.isIdentifier(node.left)
				? concatenate(environment.get(node.left.text) || [], right)
				: right;
		setIdentifierValues(node.left, assigned, environment);
		return;
	}

	if (ts.isCallExpression(node)) {
		if (applyArrayMutation(node, environment, methodNames)) return;
		if (visitStaticIteration(node, environment, methodNames)) return;
	}

	if (ts.isElementAccessExpression(node) && isLodashIdentifier(node.expression)) {
		methodNames.push(...evaluateStrings(node.argumentExpression, environment));
	}

	if (ts.isFunctionLike(node)) {
		const functionEnvironment = new Map(environment);
		for (const parameter of node.parameters) {
			deleteIdentifier(parameter.name, functionEnvironment);
		}
		const body = (node as ts.FunctionLikeDeclaration).body;
		visitOptionalNode(body, functionEnvironment, methodNames);
		return;
	}

	ts.forEachChild(node, (child) => visitNode(child, environment, methodNames));
}

function visitStaticIteration(call: ts.CallExpression, environment: StringEnvironment, methodNames: string[]): boolean {
	if (!isLodashEachCall(call) || call.arguments.length < 2) return false;
	const callback = call.arguments[1];
	if (!callback || !ts.isFunctionLike(callback)) return false;

	visitNode(call.expression, environment, methodNames);
	const collection = call.arguments[0];
	visitNode(collection, environment, methodNames);

	const callbackEnvironment = new Map(environment);
	const parameter = callback.parameters[0];
	if (parameter) {
		const collectionValues = evaluateStrings(collection, environment);
		setIdentifierValues(parameter.name, collectionValues, callbackEnvironment);
		if (ts.isIdentifier(parameter.name) && parameter.name.text === "methodName") {
			methodNames.push(...collectionValues);
		}
	}
	for (const otherParameter of callback.parameters.slice(1)) {
		deleteIdentifier(otherParameter.name, callbackEnvironment);
	}
	visitOptionalNode(callback.body, callbackEnvironment, methodNames);
	return true;
}

function applyArrayMutation(call: ts.CallExpression, environment: StringEnvironment, methodNames: string[]): boolean {
	if (!ts.isPropertyAccessExpression(call.expression)) return false;
	const { expression, name } = call.expression;
	if (!ts.isIdentifier(expression) || (name.text !== "push" && name.text !== "unshift")) return false;

	for (const argument of call.arguments) {
		visitNode(argument, environment, methodNames);
	}
	const previous = environment.get(expression.text) || [];
	const added = call.arguments.flatMap((argument) => evaluateStrings(argument, environment));
	environment.set(expression.text, unique([...previous, ...added]));
	return true;
}

function evaluateStrings(node: ts.Expression | undefined, environment: StringEnvironment): string[] {
	if (!node) return [];
	const expression = unwrapExpression(node);

	if (ts.isStringLiteralLike(expression)) return [expression.text];
	if (ts.isIdentifier(expression)) return environment.get(expression.text) || [];
	if (ts.isArrayLiteralExpression(expression)) {
		return unique(
			expression.elements.flatMap((element) => {
				if (ts.isSpreadElement(element)) return evaluateStrings(element.expression, environment);
				return evaluateStrings(element as ts.Expression, environment);
			}),
		);
	}
	if (ts.isConditionalExpression(expression)) {
		return unique([
			...evaluateStrings(expression.whenTrue, environment),
			...evaluateStrings(expression.whenFalse, environment),
		]);
	}
	if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		return concatenate(
			evaluateStrings(expression.left, environment),
			evaluateStrings(expression.right, environment),
		);
	}
	if (!ts.isCallExpression(expression) || !ts.isPropertyAccessExpression(expression.expression)) return [];

	const receiver = expression.expression.expression;
	const method = expression.expression.name.text;
	if (method === "split") {
		const separators = evaluateStrings(expression.arguments[0], environment);
		const separator = separators[0];
		if (separator === undefined) return [];
		return evaluateStrings(receiver, environment).flatMap((value) => value.split(separator));
	}
	if (method === "concat") {
		return unique([
			...evaluateStrings(receiver, environment),
			...expression.arguments.flatMap((argument) => evaluateStrings(argument, environment)),
		]);
	}
	return [];
}

function concatenate(left: readonly string[], right: readonly string[]): string[] {
	if (left.length === 0 || right.length === 0) return [];
	return unique(left.flatMap((prefix) => right.map((suffix) => prefix + suffix)));
}

function unwrapExpression(node: ts.Expression): ts.Expression {
	let expression = node;
	while (
		ts.isParenthesizedExpression(expression) ||
		ts.isAsExpression(expression) ||
		ts.isTypeAssertionExpression(expression) ||
		ts.isNonNullExpression(expression)
	) {
		expression = expression.expression;
	}
	return expression;
}

function isLodashEachCall(call: ts.CallExpression): boolean {
	if (!ts.isPropertyAccessExpression(call.expression)) return false;
	return (
		ts.isIdentifier(call.expression.expression) &&
		call.expression.expression.text === "lodashStable" &&
		call.expression.name.text === "each"
	);
}

function isLodashIdentifier(node: ts.Expression): boolean {
	return ts.isIdentifier(node) && node.text === "_";
}

function isAssignment(kind: ts.SyntaxKind): boolean {
	return kind === ts.SyntaxKind.EqualsToken || kind === ts.SyntaxKind.PlusEqualsToken;
}

function setIdentifierValues(node: ts.Node, values: readonly string[], environment: StringEnvironment) {
	if (!ts.isIdentifier(node)) return;
	if (values.length === 0) {
		environment.delete(node.text);
		return;
	}
	environment.set(node.text, unique(values));
}

function deleteIdentifier(node: ts.Node, environment: StringEnvironment) {
	if (ts.isIdentifier(node)) environment.delete(node.text);
}

function visitOptionalNode(node: ts.Node | undefined, environment: StringEnvironment, methodNames: string[]) {
	if (node) visitNode(node, environment, methodNames);
}
