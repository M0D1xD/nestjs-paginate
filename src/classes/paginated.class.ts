import { Column, SortBy } from '../types';

export class Paginated<T> {
    data: T[];
    meta: {
        itemsPerPage: number;
        totalItems: number;
        currentPage: number;
        totalPages: number;
        sortBy: SortBy<T>;
        searchBy: Column<T>[];
        search: string;
        select: string[];
        filter?: {
            [column: string]: string | string[];
        };
    };
    links: {
        first?: string;
        previous?: string;
        current: string;
        next?: string;
        last?: string;
    };
}
