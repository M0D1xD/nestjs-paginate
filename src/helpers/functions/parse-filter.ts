import { OperatorSymbolToFunction } from 'src/constants/operation-symbol-to-function';
import { JsonContains, SelectQueryBuilder } from 'typeorm';
import { FilterOperator } from '../../enums/filter-operator.enum';
import { FilterSuffix } from '../../enums/filter-suffix.enum';
import { getPropertiesByColumnName } from '../../helpers/functions/get-properties-by-column-name';
import { PaginateQuery } from '../../interfaces';
import { ColumnsFilters } from '../../types';
import { checkIsJsonb, isOperator, isSuffix } from '../checkers';
import { parseFilterToken } from './parse-filter-token';
import { fixColumnFilterValue } from './fix-column-filter-value';

export function parseFilter<T>(
    query: PaginateQuery,
    filterableColumns?: {
        [column: string]: (FilterOperator | FilterSuffix)[] | true;
    },
    qb?: SelectQueryBuilder<T>,
): ColumnsFilters {
    const filter: ColumnsFilters = {};
    if (!filterableColumns || !query.filter) {
        return {};
    }
    for (const column of Object.keys(query.filter)) {
        if (!(column in filterableColumns)) {
            continue;
        }
        const allowedOperators = filterableColumns[column];
        const input = query.filter[column];
        const statements = !Array.isArray(input) ? [input] : input;
        for (const raw of statements) {
            const token = parseFilterToken(raw);
            if (!token) {
                continue;
            }
            if (allowedOperators === true) {
                if (token.operator && !isOperator(token.operator)) {
                    continue;
                }
                if (token.suffix && !isSuffix(token.suffix)) {
                    continue;
                }
            } else {
                if (
                    token.operator &&
                    token.operator !== FilterOperator.EQ &&
                    !allowedOperators.includes(token.operator)
                ) {
                    continue;
                }
                if (token.suffix && !allowedOperators.includes(token.suffix)) {
                    continue;
                }
            }

            const params: (typeof filter)[0][0] = {
                comparator: token.comparator,
                findOperator: undefined,
            };

            const fixValue = fixColumnFilterValue(column, qb);

            const columnProperties = getPropertiesByColumnName(column);
            const isJsonb = checkIsJsonb(qb, columnProperties.column);

            switch (token.operator) {
                case FilterOperator.BTW:
                    params.findOperator = OperatorSymbolToFunction.get(
                        token.operator,
                    )(...token.value.split(',').map(fixValue));
                    break;
                case FilterOperator.IN:
                case FilterOperator.CONTAINS:
                    params.findOperator = OperatorSymbolToFunction.get(
                        token.operator,
                    )(token.value.split(','));
                    break;
                case FilterOperator.ILIKE:
                    params.findOperator = OperatorSymbolToFunction.get(
                        token.operator,
                    )(`%${token.value}%`);
                    break;
                case FilterOperator.SW:
                    params.findOperator = OperatorSymbolToFunction.get(
                        token.operator,
                    )(`${token.value}%`);
                    break;
                default:
                    params.findOperator = OperatorSymbolToFunction.get(
                        token.operator,
                    )(fixValue(token.value));
            }

            if (isJsonb) {
                const parts = column.split('.');
                const dbColumnName = parts[parts.length - 2];
                const jsonColumnName = parts[parts.length - 1];

                const jsonFixValue = fixColumnFilterValue(column, qb, true);

                const jsonParams = {
                    comparator: params.comparator,
                    findOperator: JsonContains({
                        [jsonColumnName]: jsonFixValue(token.value),
                        //! Below seems to not be possible from my understanding, https://github.com/typeorm/typeorm/pull/9665
                        //! This limits the functionaltiy to $eq only for json columns, which is a bit of a shame.
                        //! If this is fixed or changed, we can use the commented line below instead.
                        //[jsonColumnName]: params.findOperator,
                    }),
                };

                filter[dbColumnName] = [...(filter[column] || []), jsonParams];
            } else {
                filter[column] = [...(filter[column] || []), params];
            }

            if (token.suffix) {
                const lastFilterElement = filter[column].length - 1;
                filter[column][lastFilterElement].findOperator =
                    OperatorSymbolToFunction.get(token.suffix)(
                        filter[column][lastFilterElement].findOperator,
                    );
            }
        }
    }
    return filter;
}
