import { FindOperator } from 'typeorm';
import { FilterComparator } from '../enums';

export type Filter = {
    comparator: FilterComparator;
    findOperator: FindOperator<string>;
};
