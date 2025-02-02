import { Column } from './column.type';

export type RelationColumn<T> = Extract<
    Column<T>,
    {
        [K in Column<T>]: K extends `${infer R}.${string}` ? R : never;
    }[Column<T>]
>;
