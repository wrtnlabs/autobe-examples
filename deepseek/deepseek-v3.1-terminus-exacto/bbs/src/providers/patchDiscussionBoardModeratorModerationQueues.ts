import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import { IPageIDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationQueue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationQueues(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationQueue.IRequest;
}): Promise<IPageIDiscussionBoardModerationQueue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Queue type filter
  if (props.body.queue_type !== undefined && props.body.queue_type !== null) {
    whereConditions.queue_type = props.body.queue_type;
  }

  // Assignment status filter
  if (
    props.body.assigned_status !== undefined &&
    props.body.assigned_status !== null
  ) {
    switch (props.body.assigned_status) {
      case "assigned":
        whereConditions.discussion_board_moderator_id = { not: null };
        break;
      case "unassigned":
        whereConditions.discussion_board_moderator_id = null;
        break;
      case "completed":
        whereConditions.completed_at = { not: null };
        break;
    }
  }

  // Position range filters
  if (
    props.body.position_min !== undefined &&
    props.body.position_min !== null
  ) {
    whereConditions.position = {
      ...((whereConditions.position as Record<string, unknown>) || {}),
      gte: props.body.position_min,
    };
  }
  if (
    props.body.position_max !== undefined &&
    props.body.position_max !== null
  ) {
    whereConditions.position = {
      ...((whereConditions.position as Record<string, unknown>) || {}),
      lte: props.body.position_max,
    };
  }

  // Date range filters
  if (
    props.body.assigned_at_from !== undefined &&
    props.body.assigned_at_from !== null
  ) {
    whereConditions.assigned_at = {
      ...((whereConditions.assigned_at as Record<string, unknown>) || {}),
      gte: props.body.assigned_at_from,
    };
  }
  if (
    props.body.assigned_at_to !== undefined &&
    props.body.assigned_at_to !== null
  ) {
    whereConditions.assigned_at = {
      ...((whereConditions.assigned_at as Record<string, unknown>) || {}),
      lte: props.body.assigned_at_to,
    };
  }

  if (
    props.body.completed_at_from !== undefined &&
    props.body.completed_at_from !== null
  ) {
    whereConditions.completed_at = {
      ...((whereConditions.completed_at as Record<string, unknown>) || {}),
      gte: props.body.completed_at_from,
    };
  }
  if (
    props.body.completed_at_to !== undefined &&
    props.body.completed_at_to !== null
  ) {
    whereConditions.completed_at = {
      ...((whereConditions.completed_at as Record<string, unknown>) || {}),
      lte: props.body.completed_at_to,
    };
  }

  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_from !== null
  ) {
    whereConditions.created_at = {
      ...((whereConditions.created_at as Record<string, unknown>) || {}),
      gte: props.body.created_at_from,
    };
  }
  if (
    props.body.created_at_to !== undefined &&
    props.body.created_at_to !== null
  ) {
    whereConditions.created_at = {
      ...((whereConditions.created_at as Record<string, unknown>) || {}),
      lte: props.body.created_at_to,
    };
  }

  // Search filter
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    whereConditions.OR = [
      { queue_type: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";
  orderBy[orderField] = orderDirection;

  // Execute queries
  const [queues, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_queues.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_moderation_queues.count({
      where: whereConditions,
    }),
  ]);

  // Transform results
  const data = queues.map((queue) => ({
    id: queue.id,
    queue_type: queue.queue_type,
    position: queue.position,
    discussion_board_content_report_id:
      queue.discussion_board_content_report_id,
    discussion_board_moderator_id:
      queue.discussion_board_moderator_id ?? undefined,
    assigned_at: queue.assigned_at
      ? toISOStringSafe(queue.assigned_at)
      : undefined,
    started_at: queue.started_at
      ? toISOStringSafe(queue.started_at)
      : undefined,
    completed_at: queue.completed_at
      ? toISOStringSafe(queue.completed_at)
      : undefined,
    timeout_at: toISOStringSafe(queue.timeout_at ?? new Date()),
    created_at: toISOStringSafe(queue.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
