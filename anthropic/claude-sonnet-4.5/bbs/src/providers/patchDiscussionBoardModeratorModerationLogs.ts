import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationLog.IRequest;
}): Promise<IPageIDiscussionBoardModerationLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const whereCondition: Record<string, unknown> = {};

  if (props.body.action_types && props.body.action_types.length > 0) {
    whereCondition.action_type = { in: props.body.action_types };
  }

  if (props.body.moderator_id) {
    whereCondition.discussion_board_moderator_id = props.body.moderator_id;
  }

  if (props.body.article_id) {
    whereCondition.discussion_board_article_id = props.body.article_id;
  }

  if (props.body.member_id) {
    whereCondition.discussion_board_member_id = props.body.member_id;
  }

  if (props.body.from_date || props.body.to_date) {
    const dateRange: Record<string, unknown> = {};
    if (props.body.from_date) {
      dateRange.gte = new Date(props.body.from_date);
    }
    if (props.body.to_date) {
      dateRange.lte = new Date(props.body.to_date);
    }
    whereCondition.created_at = dateRange;
  }

  const [logs, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy:
        sortBy === "created_at"
          ? { created_at: order }
          : { action_type: order },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: whereCondition,
    }),
  ]);

  const logSummaries = logs.map((log) => ({
    id: log.id,
    discussion_board_moderator_id: log.discussion_board_moderator_id,
    discussion_board_article_id: log.discussion_board_article_id,
    discussion_board_member_id: log.discussion_board_member_id,
    action_type: log.action_type,
    reason: log.reason,
    action_details: log.action_details,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: logSummaries as any,
  };
}
