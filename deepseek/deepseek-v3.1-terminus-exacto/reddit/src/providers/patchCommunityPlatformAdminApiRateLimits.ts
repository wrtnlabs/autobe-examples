import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformApiRateLimit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformApiRateLimitAtSummaryTransformer } from "../transformers/CommunityPlatformApiRateLimitAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminApiRateLimits(props: {
  admin: AdminPayload;
  body: ICommunityPlatformApiRateLimit.IRequest;
}): Promise<IPageICommunityPlatformApiRateLimit.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.endpoint_path !== undefined && {
      endpoint_path: { contains: props.body.endpoint_path },
    }),
    ...(props.body.http_method !== undefined && {
      http_method: props.body.http_method,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.max_requests_min !== undefined &&
      props.body.max_requests_max !== undefined && {
        max_requests: {
          gte: props.body.max_requests_min,
          lte: props.body.max_requests_max,
        },
      }),
    ...(props.body.max_requests_min !== undefined &&
      props.body.max_requests_max === undefined && {
        max_requests: { gte: props.body.max_requests_min },
      }),
    ...(props.body.max_requests_max !== undefined &&
      props.body.max_requests_min === undefined && {
        max_requests: { lte: props.body.max_requests_max },
      }),
    ...(props.body.time_window_seconds_min !== undefined &&
      props.body.time_window_seconds_max !== undefined && {
        time_window_seconds: {
          gte: props.body.time_window_seconds_min,
          lte: props.body.time_window_seconds_max,
        },
      }),
    ...(props.body.time_window_seconds_min !== undefined &&
      props.body.time_window_seconds_max === undefined && {
        time_window_seconds: { gte: props.body.time_window_seconds_min },
      }),
    ...(props.body.time_window_seconds_max !== undefined &&
      props.body.time_window_seconds_min === undefined && {
        time_window_seconds: { lte: props.body.time_window_seconds_max },
      }),
  } satisfies Prisma.community_platform_api_rate_limitsWhereInput;
  const data =
    await MyGlobal.prisma.community_platform_api_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { endpoint_path: "asc" }],
      ...CommunityPlatformApiRateLimitAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_api_rate_limits.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformApiRateLimitAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.max(1, Math.ceil(total / limit)),
    } satisfies IPage.IPagination,
  };
}
