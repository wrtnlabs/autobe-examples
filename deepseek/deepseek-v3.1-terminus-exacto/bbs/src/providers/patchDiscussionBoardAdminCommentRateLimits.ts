import { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentRateLimit";
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
  body: IDiscussionBoardCommentRateLimit.IRequest;
}): Promise<IPageIDiscussionBoardCommentRateLimit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 50, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper timestamp handling
  const whereInput = {
    ...(props.body.discussion_board_user_id && {
      discussion_board_user_id: props.body.discussion_board_user_id,
    }),
    ...(props.body.submitted_at_start && {
      submitted_at: {
        gte: new Date(props.body.submitted_at_start),
      },
    }),
    ...(props.body.submitted_at_end && {
      submitted_at: {
        lte: new Date(props.body.submitted_at_end),
      },
    }),
  } satisfies Prisma.discussion_board_comment_rate_limitsWhereInput;
  // Sequential execution for better performance with large datasets
  const data =
    await MyGlobal.prisma.discussion_board_comment_rate_limits.findMany({
      where: whereInput,
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
          },
        } satisfies Prisma.discussion_board_usersFindManyArgs,
      } satisfies Prisma.discussion_board_comment_rate_limitsInclude,
      orderBy: {
        submitted_at: "desc",
      } satisfies Prisma.discussion_board_comment_rate_limitsOrderByWithRelationInput,
      skip,
      take: limit,
    });
  const total =
    await MyGlobal.prisma.discussion_board_comment_rate_limits.count({
      where: whereInput,
    });
  // Transform results safely
  const transformedData = await ArrayUtil.asyncMap(
    data,
    async (record) =>
      ({
        id: record.id as string & tags.Format<"uuid">,
        submitted_at: toISOStringSafe(record.submitted_at) as string &
          tags.Format<"date-time">,
        user: {
          id: record.user.id as string & tags.Format<"uuid">,
          display_name: record.user.display_name,
          bio: record.user.bio ?? null,
          created_at: toISOStringSafe(record.user.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IDiscussionBoardUser.ISummary,
      }) satisfies IDiscussionBoardCommentRateLimit.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardCommentRateLimit.ISummary;
}
