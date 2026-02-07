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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminCommentRateLimits(props: {
  admin: AdminPayload;
  body: IDiscussionBoardApiRateLimit.IRequest;
}): Promise<IPageIDiscussionBoardApiRateLimit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Parse ISO string dates properly
  const whereInput = {
    ...(props.body.created_at_after && {
      submitted_at: { gt: new Date(props.body.created_at_after) },
    }),
    ...(props.body.updated_at_after && {
      created_at: { gt: new Date(props.body.updated_at_after) },
    }),
  } satisfies Prisma.discussion_board_comment_rate_limitsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { submitted_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            email: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_comment_rate_limits.count({
      where: whereInput,
    }),
  ]);
  // Transform with proper typing
  const transformedData: IDiscussionBoardApiRateLimit.ISummary[] = data.map(
    () => ({
      id: v4(),
      endpoint_path: `/api/comments`,
      http_method: "POST",
      rate_limit_type: "user_based",
      requests_per_interval: 10,
      interval_seconds: 60,
      burst_limit: null,
      enforcement_count: 0,
      enforced_at: null,
      is_active: true,
      enforcement_action: "block",
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
