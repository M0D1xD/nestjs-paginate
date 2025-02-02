/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { mapKeys } from 'lodash';
import { stringify } from 'querystring';
import {
    Brackets,
    FindOptionsRelations,
    FindOptionsUtils,
    ObjectLiteral,
    Repository,
    SelectQueryBuilder,
} from 'typeorm';
import { WherePredicateOperator } from 'typeorm/query-builder/WhereClause';
import { OrmUtils } from 'typeorm/util/OrmUtils';
import { Paginated } from './classes/paginated.class';
import { PaginationLimit } from './constants/pagination-limit';
import {
    addFilter,
    checkIsEmbedded,
    checkIsRelation,
    extractVirtualProperty,
    fixColumnAlias,
    generateWhereStatement,
    getPropertiesByColumnName,
    getQueryUrlComponents,
    isEntityKey,
    isRepository,
} from './helpers';
import {
    includesAllPrimaryKeyColumns,
    positiveNumberOrDefault,
} from './helpers/helpers';
import { PaginateConfig, PaginateQuery } from './interfaces';
import { Column, Order, RelationColumn, SortBy } from './types';
import { PaginationTypes } from './types/pagination.type';

const logger: Logger = new Logger('nestjs-paginate');

export async function paginate<T extends ObjectLiteral>(
    query: PaginateQuery,
    repo: Repository<T> | SelectQueryBuilder<T>,
    config: PaginateConfig<T>,
): Promise<Paginated<T>> {
    const page = positiveNumberOrDefault(query.page, 1, 1);

    const defaultLimit = config.defaultLimit || PaginationLimit.DEFAULT_LIMIT;
    const maxLimit = config.maxLimit || PaginationLimit.DEFAULT_MAX_LIMIT;

    const isPaginated = !(
        query.limit === PaginationLimit.COUNTER_ONLY ||
        (query.limit === PaginationLimit.NO_PAGINATION &&
            maxLimit === PaginationLimit.NO_PAGINATION)
    );

    const limit =
        query.limit === PaginationLimit.COUNTER_ONLY
            ? PaginationLimit.COUNTER_ONLY
            : isPaginated === true
              ? maxLimit === PaginationLimit.NO_PAGINATION
                  ? (query.limit ?? defaultLimit)
                  : query.limit === PaginationLimit.NO_PAGINATION
                    ? defaultLimit
                    : Math.min(query.limit ?? defaultLimit, maxLimit)
              : defaultLimit;

    const sortBy = [] as SortBy<T>;
    const searchBy: Column<T>[] = [];

    let [items, totalItems]: [T[], number] = [[], 0];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const queryBuilder = isRepository(repo)
        ? repo.createQueryBuilder('__root')
        : repo;

    if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        isRepository(repo) &&
        !config.relations &&
        config.loadEagerRelations === true
    ) {
        if (!config.relations) {
            FindOptionsUtils.joinEagerRelations(
                queryBuilder,
                queryBuilder.alias,
                repo.metadata,
            );
        }
    }

    if (isPaginated) {
        // Allow user to choose between limit/offset and take/skip.
        // However, using limit/offset can cause problems when joining one-to-many etc.
        if (config.paginationType === PaginationTypes.LIMIT_AND_OFFSET) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            queryBuilder.limit(limit).offset((page - 1) * limit);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            queryBuilder.take(limit).skip((page - 1) * limit);
        }
    }

    if (config.relations) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const relations = Array.isArray(config.relations)
            ? OrmUtils.propertyPathsToTruthyObject(config.relations)
            : config.relations;
        const createQueryBuilderRelations = (
            prefix: string,
            relations: FindOptionsRelations<T> | RelationColumn<T>[],
            alias?: string,
        ) => {
            Object.keys(relations).forEach((relationName) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const relationSchema = relations![relationName]!;

                queryBuilder.leftJoinAndSelect(
                    `${alias ?? prefix}.${relationName}`,
                    `${alias ?? prefix}_${relationName}_rel`,
                );

                if (typeof relationSchema === 'object') {
                    createQueryBuilderRelations(
                        relationName,
                        relationSchema,
                        `${alias ?? prefix}_${relationName}_rel`,
                    );
                }
            });
        };
        createQueryBuilderRelations(queryBuilder.alias, relations);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const dbType = (isRepository(repo) ? repo.manager : repo).connection.options
        .type;
    const isMariaDbOrMySql = (dbType: string) =>
        dbType === 'mariadb' || dbType === 'mysql';
    const isMMDb = isMariaDbOrMySql(dbType);

    let nullSort: string | undefined;
    if (config.nullSort) {
        if (isMMDb) {
            nullSort = config.nullSort === 'last' ? 'IS NULL' : 'IS NOT NULL';
        } else {
            nullSort =
                config.nullSort === 'last' ? 'NULLS LAST' : 'NULLS FIRST';
        }
    }

    if (config.sortableColumns.length < 1) {
        const message = "Missing required 'sortableColumns' config.";
        logger.debug(message);
        throw new ServiceUnavailableException(message);
    }

    if (query.sortBy) {
        for (const order of query.sortBy) {
            if (
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                isEntityKey(config.sortableColumns, order[0]) &&
                ['ASC', 'DESC', 'asc', 'desc'].includes(order[1])
            ) {
                sortBy.push(order as Order<T>);
            }
        }
    }

    if (!sortBy.length) {
        sortBy.push(
            ...(config.defaultSortBy || [[config.sortableColumns[0], 'ASC']]),
        );
    }

    for (const order of sortBy) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const columnProperties = getPropertiesByColumnName(order[0]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const { isVirtualProperty } = extractVirtualProperty(
            queryBuilder,
            columnProperties,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const isRelation = checkIsRelation(
            queryBuilder,
            columnProperties.propertyPath,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const isEmbeded = checkIsEmbedded(
            queryBuilder,
            columnProperties.propertyPath,
        );
        let alias = fixColumnAlias(
            columnProperties,
            queryBuilder.alias,
            isRelation,
            isVirtualProperty,
            isEmbeded,
        );

        if (isMMDb) {
            if (isVirtualProperty) {
                alias = `\`${alias}\``;
            }
            if (nullSort) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                queryBuilder.addOrderBy(`${alias} ${nullSort}`);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            queryBuilder.addOrderBy(alias, order[1]);
        } else {
            if (isVirtualProperty) {
                alias = `"${alias}"`;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            queryBuilder.addOrderBy(
                alias,
                order[1],
                nullSort as 'NULLS FIRST' | 'NULLS LAST' | undefined,
            );
        }
    }

    // When we partial select the columns (main or relation) we must add the primary key column otherwise
    // typeorm will not be able to map the result.
    let selectParams =
        config.select && query.select && !config.ignoreSelectInQueryParam
            ? config.select.filter((column) => query.select.includes(column))
            : config.select;
    if (!includesAllPrimaryKeyColumns(queryBuilder, query.select)) {
        selectParams = config.select;
    }
    if (
        selectParams?.length > 0 &&
        includesAllPrimaryKeyColumns(queryBuilder, selectParams)
    ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const cols: string[] = selectParams.reduce((cols, currentCol) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const columnProperties = getPropertiesByColumnName(currentCol);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const isRelation = checkIsRelation(
                queryBuilder,
                columnProperties.propertyPath,
            );
            cols.push(
                fixColumnAlias(
                    columnProperties,
                    queryBuilder.alias,
                    isRelation,
                ),
            );
            return cols;
        }, []);
        queryBuilder.select(cols);
    }

    if (config.where && isRepository(repo)) {
        const baseWhereStr = generateWhereStatement(queryBuilder, config.where);
        queryBuilder.andWhere(`(${baseWhereStr})`);
    }

    if (config.withDeleted) {
        queryBuilder.withDeleted();
    }

    if (config.searchableColumns) {
        if (query.searchBy && !config.ignoreSearchByInQueryParam) {
            for (const column of query.searchBy) {
                if (isEntityKey(config.searchableColumns, column)) {
                    searchBy.push(column);
                }
            }
        } else {
            searchBy.push(...config.searchableColumns);
        }
    }

    if (query.search && searchBy.length) {
        queryBuilder.andWhere(
            new Brackets((qb: SelectQueryBuilder<T>) => {
                // Explicitly handle the default case - multiWordSearch defaults to false
                const useMultiWordSearch = config.multiWordSearch ?? false;
                if (!useMultiWordSearch) {
                    // Strict search mode (default behavior)
                    for (const column of searchBy) {
                        const property = getPropertiesByColumnName(column);
                        const { isVirtualProperty, query: virtualQuery } =
                            extractVirtualProperty(qb, property);
                        const isRelation = checkIsRelation(
                            qb,
                            property.propertyPath,
                        );
                        const isEmbedded = checkIsEmbedded(
                            qb,
                            property.propertyPath,
                        );
                        const alias = fixColumnAlias(
                            property,
                            qb.alias,
                            isRelation,
                            isVirtualProperty,
                            isEmbedded,
                            virtualQuery,
                        );

                        const condition: WherePredicateOperator = {
                            operator: 'ilike',
                            parameters: [alias, `:${property.column}`],
                        };

                        if (
                            ['postgres', 'cockroachdb'].includes(
                                queryBuilder.connection.options.type,
                            )
                        ) {
                            condition.parameters[0] = `CAST(${condition.parameters[0]} AS text)`;
                        }

                        qb.orWhere(
                            qb['createWhereConditionExpression'](condition),
                            {
                                [property.column]: `%${query.search}%`,
                            },
                        );
                    }
                } else {
                    // Multi-word search mode
                    const searchWords = query.search
                        .split(' ')
                        .filter((word) => word.length > 0);
                    searchWords.forEach((searchWord, index) => {
                        qb.andWhere(
                            new Brackets((subQb: SelectQueryBuilder<T>) => {
                                for (const column of searchBy) {
                                    const property =
                                        getPropertiesByColumnName(column);
                                    const {
                                        isVirtualProperty,
                                        query: virtualQuery,
                                    } = extractVirtualProperty(subQb, property);
                                    const isRelation = checkIsRelation(
                                        subQb,
                                        property.propertyPath,
                                    );
                                    const isEmbedded = checkIsEmbedded(
                                        subQb,
                                        property.propertyPath,
                                    );
                                    const alias = fixColumnAlias(
                                        property,
                                        subQb.alias,
                                        isRelation,
                                        isVirtualProperty,
                                        isEmbedded,
                                        virtualQuery,
                                    );

                                    const condition: WherePredicateOperator = {
                                        operator: 'ilike',
                                        parameters: [
                                            alias,
                                            `:${property.column}_${index}`,
                                        ],
                                    };

                                    if (
                                        ['postgres', 'cockroachdb'].includes(
                                            queryBuilder.connection.options
                                                .type,
                                        )
                                    ) {
                                        condition.parameters[0] = `CAST(${condition.parameters[0]} AS text)`;
                                    }

                                    subQb.orWhere(
                                        subQb['createWhereConditionExpression'](
                                            condition,
                                        ),
                                        {
                                            [`${property.column}_${index}`]: `%${searchWord}%`,
                                        },
                                    );
                                }
                            }),
                        );
                    });
                }
            }),
        );
    }

    if (query.filter) {
        addFilter(queryBuilder, query, config.filterableColumns);
    }

    if (query.limit === PaginationLimit.COUNTER_ONLY) {
        totalItems = await queryBuilder.getCount();
    } else if (isPaginated) {
        [items, totalItems] = await queryBuilder.getManyAndCount();
    } else {
        items = await queryBuilder.getMany();
    }

    const sortByQuery = sortBy
        .map((order) => `&sortBy=${order.join(':')}`)
        .join('');
    const searchQuery = query.search ? `&search=${query.search}` : '';

    const searchByQuery =
        query.searchBy && searchBy.length && !config.ignoreSearchByInQueryParam
            ? searchBy.map((column) => `&searchBy=${column}`).join('')
            : '';

    // Only expose select in meta data if query select differs from config select
    const isQuerySelected = selectParams?.length !== config.select?.length;
    const selectQuery = isQuerySelected
        ? `&select=${selectParams.join(',')}`
        : '';

    const filterQuery = query.filter
        ? '&' +
          stringify(
              mapKeys(query.filter, (_param, name) => 'filter.' + name),
              '&',
              '=',
              { encodeURIComponent: (str) => str },
          )
        : '';

    const options = `&limit=${limit}${sortByQuery}${searchQuery}${searchByQuery}${selectQuery}${filterQuery}`;

    let path: string = null;
    if (query.path !== null) {
        // `query.path` does not exist in RPC/WS requests and is set to null then.
        const { queryOrigin, queryPath } = getQueryUrlComponents(query.path);
        if (config.relativePath) {
            path = queryPath;
        } else if (config.origin) {
            path = config.origin + queryPath;
        } else {
            path = queryOrigin + queryPath;
        }
    }
    const buildLink = (p: number): string => path + '?page=' + p + options;

    const totalPages = isPaginated ? Math.ceil(totalItems / limit) : 1;

    const results: Paginated<T> = {
        data: items,
        meta: {
            itemsPerPage:
                limit === PaginationLimit.COUNTER_ONLY
                    ? totalItems
                    : isPaginated
                      ? limit
                      : items.length,
            totalItems:
                limit === PaginationLimit.COUNTER_ONLY || isPaginated
                    ? totalItems
                    : items.length,
            currentPage: page,
            totalPages,
            sortBy,
            search: query.search,
            searchBy: query.search ? searchBy : undefined,
            select: isQuerySelected ? selectParams : undefined,
            filter: query.filter,
        },
        // If there is no `path`, don't build links.
        links:
            path !== null
                ? {
                      first: page == 1 ? undefined : buildLink(1),
                      previous: page - 1 < 1 ? undefined : buildLink(page - 1),
                      current: buildLink(page),
                      next:
                          page + 1 > totalPages
                              ? undefined
                              : buildLink(page + 1),
                      last:
                          page == totalPages || !totalItems
                              ? undefined
                              : buildLink(totalPages),
                  }
                : ({} as Paginated<T>['links']),
    };

    return Object.assign(new Paginated<T>(), results);
}
