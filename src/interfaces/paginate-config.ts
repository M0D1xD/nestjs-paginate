import { Column, RelationColumn, SortBy } from '../types';
import { PaginationTypes } from '../types/pagination.type';
import {
    FindOptionsRelationByString,
    FindOptionsRelations,
    FindOptionsWhere,
} from 'typeorm';
import { FilterOperator } from '../enums/filter-operator.enum';
import { FilterSuffix } from '../enums/filter-suffix.enum';
export interface PaginateConfig<T> {
    relations?:
        | FindOptionsRelations<T>
        | RelationColumn<T>[]
        | FindOptionsRelationByString;
    sortableColumns: Column<T>[];
    nullSort?: 'first' | 'last';
    searchableColumns?: Column<T>[];
    // see https://github.com/microsoft/TypeScript/issues/29729 for (string & {})
    select?: (Column<T> | (string & {}))[];
    maxLimit?: number;
    defaultSortBy?: SortBy<T>;
    defaultLimit?: number;
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
    filterableColumns?: {
        // see https://github.com/microsoft/TypeScript/issues/29729 for (string & {})
        [key in Column<T> | (string & {})]?:
            | (FilterOperator | FilterSuffix)[]
            | true;
    };
    loadEagerRelations?: boolean;
    withDeleted?: boolean;
    paginationType?: PaginationTypes;
    relativePath?: boolean;
    origin?: string;
    ignoreSearchByInQueryParam?: boolean;
    ignoreSelectInQueryParam?: boolean;
    multiWordSearch?: boolean;
}
