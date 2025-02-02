import { FilterComparator } from '../enums/filter-comparator.enum';
import { FilterOperator } from '../enums/filter-operator.enum';
import { FilterSuffix } from '../enums/filter-suffix.enum';

export interface FilterToken {
    comparator: FilterComparator;
    suffix?: FilterSuffix;
    operator: FilterOperator;
    value: string;
}
