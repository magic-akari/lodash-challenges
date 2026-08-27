export function categoryOrder(category: string, order: readonly string[]): number {
	const index = order.indexOf(category);
	return index === -1 ? order.length : index;
}

export function unique<T>(values: readonly T[]): NonNullable<T>[] {
	return [...new Set(values.filter((value): value is NonNullable<T> => Boolean(value)))];
}
