export enum PaginationTypes {
    LIMIT_AND_OFFSET = 'limit',
    TAKE_AND_SKIP = 'take',
}

export type PaginationType = keyof typeof PaginationTypes;
