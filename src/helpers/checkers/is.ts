import type { Request as ExpressRequest } from 'express';
import { values } from 'lodash';
import { FindOperator, Repository, SelectQueryBuilder } from 'typeorm';
import { FilterComparator, FilterOperator, FilterSuffix } from '../../enums';
import { Column } from '../../types/column.type';

export function isExpressRequest(request: unknown): request is ExpressRequest {
    return isRecord(request) && typeof request.get === 'function';
}

export function isSuffix(value: unknown): value is FilterSuffix {
    return values(FilterSuffix).includes(value as any);
}

export function isEntityKey<T>(
    entityColumns: Column<T>[],
    column: string,
): column is Column<T> {
    return !!entityColumns.find((c) => c === column);
}

export function isOperator(value: unknown): value is FilterOperator {
    return values(FilterOperator).includes(value as any);
}

export function isRepository<T = unknown>(
    repo: T | Repository<T> | SelectQueryBuilder<T>,
): repo is Repository<T> {
    if (repo instanceof Repository) return true;
    try {
        if (Object.getPrototypeOf(repo).constructor.name === 'Repository')
            return true;
        return (
            typeof repo === 'object' &&
            !('connection' in repo) &&
            'manager' in repo
        );
    } catch {
        return false;
    }
}
export function isRecord(data: unknown): data is Record<string, unknown> {
    return data !== null && typeof data === 'object' && !Array.isArray(data);
}

export function checkIsEmbedded(
    qb: SelectQueryBuilder<unknown>,
    propertyPath: string,
): boolean {
    if (!qb || !propertyPath) {
        return false;
    }
    return !!qb?.expressionMap?.mainAlias?.metadata?.hasEmbeddedWithPropertyPath(
        propertyPath,
    );
}

export function isComparator(value: unknown): value is FilterComparator {
    return values(FilterComparator).includes(value as any);
}

export function checkIsJsonb(
    qb: SelectQueryBuilder<unknown>,
    propertyName: string,
): boolean {
    if (!qb || !propertyName) {
        return false;
    }

    if (propertyName.includes('.')) {
        const parts = propertyName.split('.');
        const dbColumnName = parts[parts.length - 2];

        return (
            qb?.expressionMap?.mainAlias?.metadata.findColumnWithPropertyName(
                dbColumnName,
            )?.type === 'json'
        );
    }

    return (
        qb?.expressionMap?.mainAlias?.metadata.findColumnWithPropertyName(
            propertyName,
        )?.type === 'json'
    );
}
export function checkIsArray(
    qb: SelectQueryBuilder<unknown>,
    propertyName: string,
): boolean {
    if (!qb || !propertyName) {
        return false;
    }
    return !!qb?.expressionMap?.mainAlias?.metadata.findColumnWithPropertyName(
        propertyName,
    )?.isArray;
}

export function checkIsRelation(
    qb: SelectQueryBuilder<unknown>,
    propertyPath: string,
): boolean {
    if (!qb || !propertyPath) {
        return false;
    }
    return !!qb?.expressionMap?.mainAlias?.metadata?.hasRelationWithPropertyPath(
        propertyPath,
    );
}

export function isFindOperator<T = unknown>(
    value: T | FindOperator<T>,
): value is FindOperator<T> {
    if (value instanceof FindOperator) return true;
    try {
        if (Object.getPrototypeOf(value).constructor.name === 'FindOperator')
            return true;
        return (
            typeof value === 'object' && '_type' in value && '_value' in value
        );
    } catch {
        return false;
    }
}
const isoDateRegExp = new RegExp(
    /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/,
);

export function isISODate(str: string): boolean {
    return isoDateRegExp.test(str);
}
