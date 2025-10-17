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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorModerationActions(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction> {
  const { administrator, body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  const validSortFields = ["created_at", "updated_at"];
  const sortField =
    body.sort_by && validSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [moderationActions, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where: {
        ...(body.violation_category !== undefined &&
          body.violation_category !== null && {
            violation_category: body.violation_category,
          }),
        ...(body.assigned_moderator_id !== undefined &&
          body.assigned_moderator_id !== null && {
            moderator_id: body.assigned_moderator_id,
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && {
                    gte: body.date_from,
                  }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && {
                    lte: body.date_to,
                  }),
              },
            }
          : {}),
      },
      orderBy:
        sortField === "created_at"
          ? { created_at: sortOrder }
          : { updated_at: sortOrder },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: {
        ...(body.violation_category !== undefined &&
          body.violation_category !== null && {
            violation_category: body.violation_category,
          }),
        ...(body.assigned_moderator_id !== undefined &&
          body.assigned_moderator_id !== null && {
            moderator_id: body.assigned_moderator_id,
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && {
                    gte: body.date_from,
                  }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && {
                    lte: body.date_to,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data: IDiscussionBoardModerationAction[] = moderationActions.map(
    (action) => ({
      id: action.id as string & tags.Format<"uuid">,
      moderator_id:
        action.moderator_id === null
          ? undefined
          : (action.moderator_id as string & tags.Format<"uuid">),
      administrator_id:
        action.administrator_id === null
          ? undefined
          : (action.administrator_id as string & tags.Format<"uuid">),
      target_member_id: action.target_member_id as string & tags.Format<"uuid">,
      related_report_id:
        action.related_report_id === null
          ? undefined
          : (action.related_report_id as string & tags.Format<"uuid">),
      content_topic_id:
        action.content_topic_id === null
          ? undefined
          : (action.content_topic_id as string & tags.Format<"uuid">),
      content_reply_id:
        action.content_reply_id === null
          ? undefined
          : (action.content_reply_id as string & tags.Format<"uuid">),
      action_type: action.action_type as
        | "hide_content"
        | "delete_content"
        | "issue_warning"
        | "suspend_user"
        | "ban_user"
        | "restore_content"
        | "dismiss_report",
      reason: action.reason,
      violation_category:
        action.violation_category === null
          ? undefined
          : (action.violation_category as
              | "personal_attack"
              | "hate_speech"
              | "misinformation"
              | "spam"
              | "offensive_language"
              | "off_topic"
              | "threats"
              | "doxxing"
              | "trolling"
              | "other"),
      content_snapshot:
        action.content_snapshot === null ? undefined : action.content_snapshot,
      is_reversed: action.is_reversed,
      reversed_at: action.reversed_at
        ? toISOStringSafe(action.reversed_at)
        : undefined,
      reversal_reason:
        action.reversal_reason === null ? undefined : action.reversal_reason,
      created_at: toISOStringSafe(action.created_at),
      updated_at: toISOStringSafe(action.updated_at),
    }),
  );

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data: data,
  };
}
