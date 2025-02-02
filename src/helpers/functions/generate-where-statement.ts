/* eslint-disable @typescript-eslint/no-unsafe-return */
import { FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
import { checkIsEmbedded, isFindOperator, checkIsRelation } from '../checkers';
import { extractVirtualProperty } from './extract-virtual-property';
import { fixColumnAlias } from './fix-column-alias';
import { getPropertiesByColumnName } from './get-properties-by-column-name';

function flattenWhereAndTransform<T>(
    queryBuilder: SelectQueryBuilder<T>,
    obj: FindOptionsWhere<T>,
    separator = '.',
    parentKey = '',
) {
    return Object.entries(obj).flatMap(([key, value]) => {
        if (obj.hasOwnProperty(key)) {
            const joinedKey = parentKey
                ? `${parentKey}${separator}${key}`
                : key;

            if (
                typeof value === 'object' &&
                value !== null &&
                !isFindOperator(value)
            ) {
                return flattenWhereAndTransform(
                    queryBuilder,
                    value as FindOptionsWhere<T>,
                    separator,
                    joinedKey,
                );
            } else {
                const property = getPropertiesByColumnName(joinedKey);
                const { isVirtualProperty, query: virtualQuery } =
                    extractVirtualProperty(queryBuilder, property);
                const isRelation = checkIsRelation(
                    queryBuilder,
                    property.propertyPath,
                );
                const isEmbedded = checkIsEmbedded(
                    queryBuilder,
                    property.propertyPath,
                );
                const alias = fixColumnAlias(
                    property,
                    queryBuilder.alias,
                    isRelation,
                    isVirtualProperty,
                    isEmbedded,
                    virtualQuery,
                );
                const whereClause = queryBuilder[
                    'createWhereConditionExpression'
                ](queryBuilder['getWherePredicateCondition'](alias, value));

                const allJoinedTables =
                    queryBuilder.expressionMap.joinAttributes.reduce(
                        (acc, attr) => {
                            acc[attr.alias.name] = true;
                            return acc;
                        },
                        {} as Record<string, boolean>,
                    );

                const allTablesInPath = property.column.split('.').slice(0, -1);
                const tablesToJoin = allTablesInPath.map((table, idx) => {
                    if (idx === 0) {
                        return table;
                    }
                    return [...allTablesInPath.slice(0, idx), table].join('.');
                });

                tablesToJoin.forEach((table) => {
                    const pathSplit = table.split('.');
                    const fullPath =
                        pathSplit.length === 1
                            ? ''
                            : `_${pathSplit
                                  .slice(0, -1)
                                  .map((p) => p + '_rel')
                                  .join('_')}`;
                    const tableName = pathSplit[pathSplit.length - 1];
                    const tableAliasWithProperty = `${queryBuilder.alias}${fullPath}.${tableName}`;
                    const joinTableAlias = `${queryBuilder.alias}${fullPath}_${tableName}_rel`;

                    const baseTableAlias = allJoinedTables[joinTableAlias];

                    if (baseTableAlias) {
                        return;
                    } else {
                        queryBuilder.leftJoin(
                            tableAliasWithProperty,
                            joinTableAlias,
                        );
                    }
                });

                return whereClause;
            }
        }
    });
}
export function generateWhereStatement<T>(
    queryBuilder: SelectQueryBuilder<T>,
    obj: FindOptionsWhere<T> | FindOptionsWhere<T>[],
) {
    const toTransform = Array.isArray(obj) ? obj : [obj];
    return toTransform
        .map((item) =>
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            flattenWhereAndTransform(queryBuilder, item).join(' AND '),
        )
        .join(' OR ');
}
