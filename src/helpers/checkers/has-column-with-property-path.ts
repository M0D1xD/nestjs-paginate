import { SelectQueryBuilder } from 'typeorm';
import { ColumnProperties } from '../../types/column-property.type';

export function hasColumnWithPropertyPath(
    qb: SelectQueryBuilder<unknown>,
    columnProperties: ColumnProperties,
): boolean {
    if (!qb || !columnProperties) {
        return false;
    }
    return !!qb.expressionMap.mainAlias?.metadata?.hasColumnWithPropertyPath(
        columnProperties.propertyName,
    );
}
