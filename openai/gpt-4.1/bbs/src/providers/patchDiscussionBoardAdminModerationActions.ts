import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminModerationActions(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction.ISummary> {
  const { body } = props;
  const page = Number(body.page);
  const limit = Number(body.limit);
  const skip = (page - 1) * limit;

  // Build where clause for Prisma
  const where = {
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { admin_id: body.admin_id }),
    ...(body.target_article_id !== undefined &&
      body.target_article_id !== null && {
        target_article_id: body.target_article_id,
      }),
    ...(body.target_comment_id !== undefined &&
      body.target_comment_id !== null && {
        target_comment_id: body.target_comment_id,
      }),
    ...(body.abuse_report_id !== undefined &&
      body.abuse_report_id !== null && {
        abuse_report_id: body.abuse_report_id,
      }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && { action_type: body.action_type }),
    ...(body.action_reason !== undefined &&
      body.action_reason !== null && {
        action_reason: { contains: body.action_reason },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Only allow sorting on allowed fields
  const allowedSortFields = ["created_at", "action_type", "admin_id"];
  const sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Query Prisma for count and datalist in parallel
  const [total, actions] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_actions.count({ where }),
    MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        admin_id: true,
        target_article_id: true,
        target_comment_id: true,
        action_type: true,
        action_reason: true,
        created_at: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: actions.map((action) => ({
      id: action.id,
      admin_id: action.admin_id,
      target_article_id: action.target_article_id ?? null,
      target_comment_id: action.target_comment_id ?? null,
      action_type: action.action_type,
      action_reason: action.action_reason,
      created_at: toISOStringSafe(action.created_at),
    })),
  };
}
