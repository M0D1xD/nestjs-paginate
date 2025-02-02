import { Column } from './column.type';

export type Order<T> = [Column<T>, 'ASC' | 'DESC'];
