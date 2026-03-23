import { IEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRateLimitTracking";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRateLimitTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRateLimitTracking";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRateLimitTrackings(props: {
  admin: AdminPayload;
  body: IEcommerceMallRateLimitTracking.IRequest;
}): Promise<IPageIEcommerceMallRateLimitTracking.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build filter conditions from request
  const whereInput: Prisma.ecommerce_mall_rate_limit_trackingsWhereInput = {
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.user_id !== undefined && {
      user_id:
        props.body.user_id === null
          ? { equals: null }
          : { equals: props.body.user_id },
    }),
    ...(props.body.blocked !== undefined && { blocked: props.body.blocked }),
    ...(props.body.window_start_range && {
      window_start:
        props.body.window_start_range.from && props.body.window_start_range.to
          ? {
              gte: props.body.window_start_range.from,
              lte: props.body.window_start_range.to,
            }
          : props.body.window_start_range.from
            ? { gte: props.body.window_start_range.from }
            : props.body.window_start_range.to
              ? { lte: props.body.window_start_range.to }
              : undefined,
    }),
    ...(props.body.window_end_range && {
      window_end:
        props.body.window_end_range.from && props.body.window_end_range.to
          ? {
              gte: props.body.window_end_range.from,
              lte: props.body.window_end_range.to,
            }
          : props.body.window_end_range.from
            ? { gte: props.body.window_end_range.from }
            : props.body.window_end_range.to
              ? { lte: props.body.window_end_range.to }
              : undefined,
    }),
  } satisfies Prisma.ecommerce_mall_rate_limit_trackingsWhereInput;
  // Sequential query for data and count
  const records =
    await MyGlobal.prisma.ecommerce_mall_rate_limit_trackings.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { window_start: "desc" as const },
      select: {
        id: true,
        ip: true,
        user_id: true,
        request_count: true,
        window_start: true,
        window_end: true,
        blocked: true,
        blocked_until: true,
      },
    });
  const total = await MyGlobal.prisma.ecommerce_mall_rate_limit_trackings.count(
    {
      where: whereInput,
    },
  );
  // Map records to response DTO - handle null Date values properly
  const data: IEcommerceMallRateLimitTracking.ISummary[] = records.map(
    (record) => ({
      id: record.id as string & tags.Format<"uuid">,
      ip: record.ip,
      user_id: record.user_id as (string & tags.Format<"uuid">) | null,
      request_count: record.request_count as number & tags.Type<"int32">,
      window_start: toISOStringSafe(record.window_start) as string &
        tags.Format<"date-time">,
      window_end: toISOStringSafe(record.window_end) as string &
        tags.Format<"date-time">,
      blocked: record.blocked,
      blocked_until: record.blocked_until
        ? (toISOStringSafe(record.blocked_until) as string &
            tags.Format<"date-time">)
        : ("9999-12-31T23:59:59.999Z" as string & tags.Format<"date-time">),
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallRateLimitTracking.ISummary;
}
