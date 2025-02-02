import { Brackets, SelectQueryBuilder } from 'typeorm';
import { FilterComparator, FilterOperator, FilterSuffix } from '../../enums';
import { PaginateQuery } from '../../interfaces';
import { addWhereCondition } from './add-where-condition';
import { parseFilter } from './parse-filter';

export function addFilter<T>(
    qb: SelectQueryBuilder<T>,
    query: PaginateQuery,
    filterableColumns?: {
        [column: string]: (FilterOperator | FilterSuffix)[] | true;
    },
): SelectQueryBuilder<T> {
    const filter = parseFilter(query, filterableColumns, qb);

    const filterEntries = Object.entries(filter);
    const orFilters = filterEntries.filter(
        ([_, value]) => value[0].comparator === FilterComparator.OR,
    );
    const andFilters = filterEntries.filter(
        ([_, value]) => value[0].comparator === FilterComparator.AND,
    );

    qb.andWhere(
        new Brackets((qb: SelectQueryBuilder<T>) => {
            for (const [column] of orFilters) {
                addWhereCondition(qb, column, filter);
            }
        }),
    );

    for (const [column] of andFilters) {
        qb.andWhere(
            new Brackets((qb: SelectQueryBuilder<T>) => {
                addWhereCondition(qb, column, filter);
            }),
        );
    }

    return qb;
}
