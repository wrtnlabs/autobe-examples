import { IEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallApiLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallApiLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallApiLogAtSummaryTransformer } from "../transformers/EcommerceMallApiLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminApiLogs(props: {
  admin: AdminPayload;
  body: IEcommerceMallApiLog.IRequest;
}): Promise<IPageIEcommerceMallApiLog.ISummary> {
  const limit = props.body.page?.limit ?? 100;
  const dateWhere: Prisma.ecommerce_mall_api_logsWhereInput[] = [];
  if (props.body.created_at_range) {
    if (props.body.created_at_range.from !== undefined) {
      dateWhere.push({
        created_at: {
          gte: toISOStringSafe(new Date(props.body.created_at_range.from)),
        },
      });
    }
    if (props.body.created_at_range.to !== undefined) {
      dateWhere.push({
        created_at: {
          lte: toISOStringSafe(new Date(props.body.created_at_range.to)),
        },
      });
    }
  }
  const latencyWhere: Prisma.ecommerce_mall_api_logsWhereInput[] = [];
  if (props.body.latency_ms_range) {
    if (props.body.latency_ms_range.min !== undefined) {
      latencyWhere.push({
        latency_ms: { gte: props.body.latency_ms_range.min },
      });
    }
    if (props.body.latency_ms_range.max !== undefined) {
      latencyWhere.push({
        latency_ms: { lte: props.body.latency_ms_range.max },
      });
    }
  }
  const andClauses: Prisma.ecommerce_mall_api_logsWhereInput[] = [
    { deleted_at: null },
    ...(props.body.ip ? [{ ip: { contains: props.body.ip } }] : []),
    ...(props.body.href ? [{ href: { contains: props.body.href } }] : []),
    ...(props.body.method ? [{ method: props.body.method }] : []),
    ...(props.body.response_status !== undefined
      ? [{ response_status: props.body.response_status }]
      : []),
    ...dateWhere,
    ...latencyWhere,
  ];
  if (props.body.error_message !== undefined) {
    andClauses.push({
      error_message: props.body.error_message ? { not: null } : null,
    });
  }
  const where: Prisma.ecommerce_mall_api_logsWhereInput =
    andClauses.length > 1 ? { AND: andClauses } : andClauses[0];
  const direction = props.body.page?.direction ?? "desc";
  const orderBy: Prisma.ecommerce_mall_api_logsOrderByWithRelationInput = {
    created_at: direction,
    id: direction,
  } satisfies Prisma.ecommerce_mall_api_logsOrderByWithRelationInput;
  const cursor = props.body.page?.cursor
    ? (() => {
        try {
          const decoded = JSON.parse(atob(props.body.page.cursor));
          return {
            created_at: toISOStringSafe(new Date(decoded.created_at)),
            id: decoded.id,
          };
        } catch {
          return undefined;
        }
      })()
    : undefined;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_api_logs.findMany({
      where,
      orderBy,
      cursor: cursor
        ? { created_at: cursor.created_at, id: cursor.id }
        : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1,
      ...EcommerceMallApiLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_api_logs.count({ where }),
  ]);
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore
    ? btoa(
        JSON.stringify({
          created_at: toISOStringSafe(items[items.length - 1].created_at),
          id: items[items.length - 1].id,
        }),
      )
    : null;
  const result = await ArrayUtil.asyncMap(
    items,
    EcommerceMallApiLogAtSummaryTransformer.transform,
  );
  return {
    data: result,
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
