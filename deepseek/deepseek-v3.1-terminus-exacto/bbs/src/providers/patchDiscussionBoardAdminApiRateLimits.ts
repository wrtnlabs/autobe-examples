import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardApiRateLimitAtSummaryTransformer } from "../transformers/DiscussionBoardApiRateLimitAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminApiRateLimits(props: {
  admin: AdminPayload;
  body: IDiscussionBoardApiRateLimit.IRequest;
}): Promise<IPageIDiscussionBoardApiRateLimit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    deleted_at: null,
    ...(props.body.endpoint_path && {
      endpoint_path: {
        contains: props.body.endpoint_path,
        mode: "insensitive",
      },
    }),
    ...(props.body.http_method && { http_method: props.body.http_method }),
    ...(props.body.rate_limit_type && {
      rate_limit_type: props.body.rate_limit_type,
    }),
    ...(props.body.enforcement_action && {
      enforcement_action: props.body.enforcement_action,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.created_at_after && {
      created_at: { gt: props.body.created_at_after },
    }),
    ...(props.body.updated_at_after && {
      updated_at: { gt: props.body.updated_at_after },
    }),
  } satisfies Prisma.discussion_board_api_rate_limitsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_api_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardApiRateLimitAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_api_rate_limits.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardApiRateLimitAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
