import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentModerationLogAtSummaryTransformer } from "../transformers/DiscussionBoardContentModerationLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminContentModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardContentModerationLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build complex WHERE clause with string-based date comparisons
  const whereInput = {
    ...(props.body.admin_id && { admin_id: props.body.admin_id }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.target_content_type && {
      target_content_type: props.body.target_content_type,
    }),
    ...(props.body.created_at_from &&
      props.body.created_at_to && {
        created_at: {
          gte: props.body.created_at_from,
          lte: props.body.created_at_to,
        },
      }),
    ...(props.body.created_at_from &&
      !props.body.created_at_to && {
        created_at: {
          gte: props.body.created_at_from,
        },
      }),
    ...(!props.body.created_at_from &&
      props.body.created_at_to && {
        created_at: {
          lte: props.body.created_at_to,
        },
      }),
    ...(props.body.search &&
      props.body.search.trim().length > 0 && {
        OR: [
          {
            reason: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            action_type: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  } satisfies Prisma.discussion_board_content_moderation_logsWhereInput;
  // Execute queries sequentially for proper transaction handling
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_moderation_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardContentModerationLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_content_moderation_logs.count({
      where: whereInput,
    }),
  ]);
  // Transform data using async map for proper Promise.all usage
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardContentModerationLogAtSummaryTransformer.transform,
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
