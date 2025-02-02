import { isString } from 'lodash';

export function parseParam<T>(
    queryParam: unknown,
    parserLogic: (param: string, res: any[]) => void,
): T[] | undefined {
    const res = [];
    if (queryParam) {
        const params = !Array.isArray(queryParam) ? [queryParam] : queryParam;
        for (const param of params) {
            if (isString(param)) {
                parserLogic(param, res);
            }
        }
    }
    return res.length ? res : undefined;
}
