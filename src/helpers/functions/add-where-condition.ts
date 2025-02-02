import { SelectQueryBuilder } from 'typeorm';
import { FilterComparator } from '../../enums/filter-comparator.enum';
import { ColumnsFilters, Filter } from '../../types';
import { checkIsArray, checkIsEmbedded, checkIsRelation } from '../checkers';
import { extractVirtualProperty } from './extract-virtual-property';
import { fixColumnAlias } from './fix-column-alias';
import { fixQueryParam } from './fix-query-params';
import { generatePredicateCondition } from './generate-predicate-condition';
import { getPropertiesByColumnName } from './get-properties-by-column-name';

export function addWhereCondition<T>(
    qb: SelectQueryBuilder<T>,
    column: string,
    filter: ColumnsFilters,
) {
    const columnProperties = getPropertiesByColumnName(column);
    const { isVirtualProperty, query: virtualQuery } = extractVirtualProperty(
        qb,
        columnProperties,
    );
    const isRelation = checkIsRelation(qb, columnProperties.propertyPath);
    const isEmbedded = checkIsEmbedded(qb, columnProperties.propertyPath);
    const isArray = checkIsArray(qb, columnProperties.propertyName);

    const alias = fixColumnAlias(
        columnProperties,
        qb.alias,
        isRelation,
        isVirtualProperty,
        isEmbedded,
        virtualQuery,
    );
    filter[column].forEach((columnFilter: Filter, index: number) => {
        const columnNamePerIteration = `${columnProperties.column}${index}`;
        const condition = generatePredicateCondition(
            qb,
            columnProperties.column,
            columnFilter,
            alias,
            isVirtualProperty,
        );
        const parameters = fixQueryParam(
            alias,
            columnNamePerIteration,
            columnFilter,
            condition,
            {
                [columnNamePerIteration]: columnFilter.findOperator.value,
            },
        );
        if (
            isArray &&
            condition.parameters?.length &&
            !['not', 'isNull', 'arrayContains'].includes(condition.operator)
        ) {
            condition.parameters[0] = `cardinality(${condition.parameters[0]})`;
        }
        if (columnFilter.comparator === FilterComparator.OR) {
            qb.orWhere(
                qb['createWhereConditionExpression'](condition),
                parameters,
            );
        } else {
            qb.andWhere(
                qb['createWhereConditionExpression'](condition),
                parameters,
            );
        }
    });
}
