import { SelectQueryBuilder } from 'typeorm';
import { isISODate } from '../checkers/is';
import { extractVirtualProperty } from './extract-virtual-property';
import { getPropertiesByColumnName } from './get-properties-by-column-name';

export function fixColumnFilterValue<T>(
    column: string,
    qb: SelectQueryBuilder<T>,
    isJsonb = false,
) {
    const columnProperties = getPropertiesByColumnName(column);
    const virtualProperty = extractVirtualProperty(qb, columnProperties);
    const columnType = virtualProperty.type;

    return (value: string) => {
        if ((columnType === Date || isJsonb) && isISODate(value)) {
            return new Date(value);
        }

        if ((columnType === Number || isJsonb) && !Number.isNaN(value)) {
            return Number(value);
        }

        return value;
    };
}
