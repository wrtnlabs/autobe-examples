import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationQueue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardContentModerationQueueAtSummaryTransformer } from "../transformers/DiscussionBoardContentModerationQueueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminModerationQueue(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentModerationQueue.IRequest;
}): Promise<IPageIDiscussionBoardContentModerationQueue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput: Prisma.discussion_board_content_moderation_queuesWhereInput =
    {
      // Filter by moderation_status
      ...(props.body.moderation_status !== undefined &&
        props.body.moderation_status !== null && {
          moderation_status: props.body.moderation_status,
        }),
      // Filter by priority_level
      ...(props.body.priority_level !== undefined &&
        props.body.priority_level !== null && {
          priority_level: props.body.priority_level,
        }),
      // Filter by assigned_admin_id
      ...(props.body.assigned_admin_id !== undefined &&
        props.body.assigned_admin_id !== null && {
          assigned_admin_id: props.body.assigned_admin_id,
        }),
      // Filter by auto_flagged
      ...(props.body.auto_flagged !== undefined &&
        props.body.auto_flagged !== null && {
          auto_flagged: props.body.auto_flagged,
        }),
      // Date range filtering - Prisma handles ISO strings correctly
      ...(props.body.created_at_start || props.body.created_at_end
        ? {
            created_at: {
              ...(props.body.created_at_start && {
                gte: props.body.created_at_start,
              }),
              ...(props.body.created_at_end && {
                lte: props.body.created_at_end,
              }),
            },
          }
        : {}),
      ...(props.body.assigned_at_start || props.body.assigned_at_end
        ? {
            assigned_at: {
              ...(props.body.assigned_at_start && {
                gte: props.body.assigned_at_start,
              }),
              ...(props.body.assigned_at_end && {
                lte: props.body.assigned_at_end,
              }),
            },
          }
        : {}),
      ...(props.body.resolved_at_start || props.body.resolved_at_end
        ? {
            resolved_at: {
              ...(props.body.resolved_at_start && {
                gte: props.body.resolved_at_start,
              }),
              ...(props.body.resolved_at_end && {
                lte: props.body.resolved_at_end,
              }),
            },
          }
        : {}),
    };
  // Execute queries sequentially (not Promise.all for better error handling)
  const data =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardContentModerationQueueAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_content_moderation_queues.count({
      where: whereInput,
    });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardContentModerationQueueAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
