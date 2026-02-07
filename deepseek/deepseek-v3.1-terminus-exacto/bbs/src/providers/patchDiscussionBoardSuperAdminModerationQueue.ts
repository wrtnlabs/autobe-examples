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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardContentModerationQueueAtSummaryTransformer } from "../transformers/DiscussionBoardContentModerationQueueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminModerationQueue(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardContentModerationQueue.IRequest;
}): Promise<IPageIDiscussionBoardContentModerationQueue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper null handling
  const whereInput: Prisma.discussion_board_content_moderation_queuesWhereInput =
    {
      // Remove deleted_at as it doesn't exist in Prisma schema
    };
  // Handle nullable string filters with proper null filtering
  if (
    props.body.moderation_status !== undefined &&
    props.body.moderation_status !== null
  ) {
    whereInput.moderation_status = props.body.moderation_status;
  }
  if (
    props.body.priority_level !== undefined &&
    props.body.priority_level !== null
  ) {
    whereInput.priority_level = props.body.priority_level;
  }
  if (
    props.body.assigned_admin_id !== undefined &&
    props.body.assigned_admin_id !== null
  ) {
    whereInput.assigned_admin_id = props.body.assigned_admin_id;
  }
  if (
    props.body.auto_flagged !== undefined &&
    props.body.auto_flagged !== null
  ) {
    whereInput.auto_flagged = props.body.auto_flagged;
  }
  // Handle date range filters
  if (props.body.created_at_start || props.body.created_at_end) {
    whereInput.created_at = {};
    if (props.body.created_at_start) {
      whereInput.created_at.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      whereInput.created_at.lte = props.body.created_at_end;
    }
  }
  if (props.body.assigned_at_start || props.body.assigned_at_end) {
    whereInput.assigned_at = {};
    if (props.body.assigned_at_start) {
      whereInput.assigned_at.gte = props.body.assigned_at_start;
    }
    if (props.body.assigned_at_end) {
      whereInput.assigned_at.lte = props.body.assigned_at_end;
    }
  }
  if (props.body.resolved_at_start || props.body.resolved_at_end) {
    whereInput.resolved_at = {};
    if (props.body.resolved_at_start) {
      whereInput.resolved_at.gte = props.body.resolved_at_start;
    }
    if (props.body.resolved_at_end) {
      whereInput.resolved_at.lte = props.body.resolved_at_end;
    }
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_moderation_queues.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardContentModerationQueueAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_content_moderation_queues.count({
      where: whereInput,
    }),
  ]);
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
    },
  };
}
