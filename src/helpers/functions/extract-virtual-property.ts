import { SelectQueryBuilder } from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { ColumnProperties } from '../../types/column-property.type';

export function extractVirtualProperty(
    qb: SelectQueryBuilder<unknown>,
    columnProperties: ColumnProperties,
): Partial<ColumnMetadata> {
    const metadata = columnProperties.propertyPath
        ? qb?.expressionMap?.mainAlias?.metadata?.findColumnWithPropertyPath(
              columnProperties.propertyPath,
          )?.referencedColumn?.entityMetadata // on relation
        : qb?.expressionMap?.mainAlias?.metadata;
    return (
        metadata?.columns?.find(
            (column) => column.propertyName === columnProperties.propertyName,
        ) || {
            isVirtualProperty: false,
            query: undefined,
        }
    );
}
