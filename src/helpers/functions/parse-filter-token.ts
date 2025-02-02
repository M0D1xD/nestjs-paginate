import { FilterComparator, FilterOperator, FilterSuffix } from '../../enums';
import { FilterToken } from '../../interfaces';
import { isComparator, isOperator, isSuffix } from '../checkers';

export function parseFilterToken(raw?: string): FilterToken | null {
    if (raw === undefined || raw === null) {
        return null;
    }

    const token: FilterToken = {
        comparator: FilterComparator.AND,
        suffix: undefined,
        operator: FilterOperator.EQ,
        value: raw,
    };

    const MAX_OPERATORS = 4; // max 4 operator es: $and:$not:$eq:$null
    const OPERAND_SEPARATOR = ':';

    const matches = raw.split(OPERAND_SEPARATOR);
    const maxOperandCount =
        matches.length > MAX_OPERATORS ? MAX_OPERATORS : matches.length;
    const notValue: (FilterOperator | FilterSuffix | FilterComparator)[] = [];

    for (let i = 0; i < maxOperandCount; i++) {
        const match = matches[i];
        if (isComparator(match)) {
            token.comparator = match;
        } else if (isSuffix(match)) {
            token.suffix = match;
        } else if (isOperator(match)) {
            token.operator = match;
        } else {
            break;
        }
        notValue.push(match);
    }

    if (notValue.length) {
        token.value =
            token.operator === FilterOperator.NULL
                ? undefined
                : raw.replace(
                      `${notValue.join(OPERAND_SEPARATOR)}${OPERAND_SEPARATOR}`,
                      '',
                  );
    }

    return token;
}
