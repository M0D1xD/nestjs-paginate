import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import type { FastifyRequest } from 'fastify';
import { Dictionary, isString, mapKeys, pickBy } from 'lodash';
import {
    multipleAndCommaSplit,
    multipleSplit,
    singleSplit,
} from '../helpers/functions';
import { isExpressRequest } from '../helpers/checkers';
import { parseParam } from '../helpers/functions/parse-params';
import { PaginateQuery } from '../interfaces/pagination-query.interface';

export const Paginate = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): PaginateQuery => {
        let path: string;
        let query: Record<string, unknown>;

        switch (ctx.getType()) {
            case 'http': {
                const request: ExpressRequest | FastifyRequest = ctx
                    .switchToHttp()
                    .getRequest();
                query = request.query as Record<string, unknown>;

                // Determine if Express or Fastify to rebuild the original url and reduce down to protocol, host and base url
                let originalUrl: string;
                if (isExpressRequest(request)) {
                    originalUrl =
                        request.protocol +
                        '://' +
                        request.get('host') +
                        request.originalUrl;
                } else {
                    originalUrl =
                        request.protocol +
                        '://' +
                        request.hostname +
                        request.url;
                }

                const urlParts = new URL(originalUrl);
                path =
                    urlParts.protocol +
                    '//' +
                    urlParts.host +
                    urlParts.pathname;
                break;
            }
            case 'ws':
                query = ctx.switchToWs().getData();
                path = null;
                break;
            case 'rpc':
                query = ctx.switchToRpc().getData();
                path = null;
                break;
        }

        const searchBy = parseParam<string>(query.searchBy, singleSplit);
        const sortBy = parseParam<[string, string]>(
            query.sortBy,
            multipleSplit,
        );
        const select = parseParam<string>(query.select, multipleAndCommaSplit);

        const filter = mapKeys(
            pickBy(
                query,
                (param, name) =>
                    name.includes('filter.') &&
                    (isString(param) ||
                        (Array.isArray(param) &&
                            param.every((p) => isString(p)))),
            ) as Dictionary<string | string[]>,
            (_param, name) => name.replace('filter.', ''),
        );

        return {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            page: query.page ? parseInt(query.page.toString(), 10) : undefined,
            limit: query.limit
                ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  parseInt(query.limit.toString(), 10)
                : undefined,
            sortBy,
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            search: query.search ? query.search.toString() : undefined,
            searchBy,
            filter: Object.keys(filter).length ? filter : undefined,
            select,
            path,
        };
    },
);
