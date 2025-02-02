import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { ColumnProperties } from '../../types/column-property.type';

// This function is used to fix the column alias when using relation, embedded or virtual properties
export function fixColumnAlias(
    properties: ColumnProperties,
    alias: string,
    isRelation = false,
    isVirtualProperty = false,
    isEmbedded = false,
    query?: ColumnMetadata['query'],
): string {
    if (isRelation) {
        if (isVirtualProperty && query) {
            return `(${query(`${alias}_${properties.propertyPath}_rel`)})`; // () is needed to avoid parameter conflict
        } else if ((isVirtualProperty && !query) || properties.isNested) {
            if (properties.propertyName.includes('.')) {
                const propertyPath = properties.propertyName.split('.');
                const nestedRelations = propertyPath
                    .slice(0, -1)
                    .map((v) => `${v}_rel`)
                    .join('_');
                const nestedCol = propertyPath[propertyPath.length - 1];

                return `${alias}_${properties.propertyPath}_rel_${nestedRelations}.${nestedCol}`;
            } else {
                return `${alias}_${properties.propertyPath}_rel_${properties.propertyName}`;
            }
        } else {
            return `${alias}_${properties.propertyPath}_rel.${properties.propertyName}`;
        }
    } else if (isVirtualProperty) {
        return query
            ? `(${query(`${alias}`)})`
            : `${alias}_${properties.propertyName}`;
    } else if (isEmbedded) {
        return `${alias}.${properties.propertyPath}.${properties.propertyName}`;
    } else {
        return `${alias}.${properties.propertyName}`;
    }
}
