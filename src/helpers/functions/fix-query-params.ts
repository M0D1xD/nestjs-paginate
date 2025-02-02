import { WherePredicateOperator } from 'typeorm/query-builder/WhereClause';
import { Filter } from '../../types';

// This function is used to fix the query parameters when using relation, embedded or virtual properties
// It will replace the column name with the alias name and return the new parameters
export function fixQueryParam(
    alias: string,
    column: string,
    filter: Filter,
    condition: WherePredicateOperator,
    parameters: { [key: string]: string },
): { [key: string]: string } {
    const isNotOperator = (condition.operator as string) === 'not';

    const conditionFixer = (
        alias: string,
        column: string,
        filter: Filter,
        operator: WherePredicateOperator['operator'],
        parameters: { [key: string]: string },
    ): { condition_params: any; params: any } => {
        let condition_params: any = undefined;
        let params = parameters;
        switch (operator) {
            case 'between':
                condition_params = [alias, `:${column}_from`, `:${column}_to`];
                params = {
                    [column + '_from']: filter.findOperator.value[0],
                    [column + '_to']: filter.findOperator.value[1],
                };
                break;
            case 'in':
                condition_params = [alias, `:...${column}`];
                break;
            default:
                condition_params = [alias, `:${column}`];
                break;
        }
        return { condition_params, params };
    };

    const { condition_params, params } = conditionFixer(
        alias,
        column,
        filter,
        isNotOperator ? condition['condition']['operator'] : condition.operator,
        parameters,
    );

    if (isNotOperator) {
        condition['condition']['parameters'] = condition_params;
    } else {
        condition.parameters = condition_params;
    }

    return params;
}
