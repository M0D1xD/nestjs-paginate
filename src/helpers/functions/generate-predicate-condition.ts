import { SelectQueryBuilder } from 'typeorm';
import { WherePredicateOperator } from 'typeorm/query-builder/WhereClause';
import { Filter } from '../../types';

export function generatePredicateCondition(
    qb: SelectQueryBuilder<unknown>,
    column: string,
    filter: Filter,
    alias: string,
    isVirtualProperty = false,
): WherePredicateOperator {
    return qb['getWherePredicateCondition'](
        isVirtualProperty ? column : alias,
        filter.findOperator,
    ) as WherePredicateOperator;
}
