import { SelectQueryBuilder } from 'typeorm';

export const positiveNumberOrDefault = (
    value: number | undefined,
    defaultValue: number,
    minValue: 0 | 1 = 0,
) => (value === undefined || value < minValue ? defaultValue : value);

export function includesAllPrimaryKeyColumns(
    qb: SelectQueryBuilder<unknown>,
    propertyPath: string[],
): boolean {
    if (!qb || !propertyPath) {
        return false;
    }
    return qb.expressionMap.mainAlias?.metadata?.primaryColumns
        .map((column) => column.propertyPath)
        .every((column) => propertyPath.includes(column));
}
