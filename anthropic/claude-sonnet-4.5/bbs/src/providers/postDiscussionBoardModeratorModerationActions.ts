import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.ICreate;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderator, body } = props;

  const now = toISOStringSafe(new Date());
  const newId = v4();

  const created =
    await MyGlobal.prisma.discussion_board_moderation_actions.create({
      data: {
        id: newId,
        moderator_id:
          body.moderator_id !== undefined && body.moderator_id !== null
            ? body.moderator_id
            : moderator.id,
        administrator_id: body.administrator_id ?? null,
        target_member_id: body.target_member_id,
        related_report_id: body.related_report_id ?? null,
        content_topic_id: body.content_topic_id ?? null,
        content_reply_id: body.content_reply_id ?? null,
        action_type: body.action_type,
        reason: body.reason,
        violation_category: body.violation_category ?? null,
        content_snapshot: body.content_snapshot ?? null,
        is_reversed: false,
        reversed_at: null,
        reversal_reason: null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    moderator_id:
      created.moderator_id === null ? undefined : created.moderator_id,
    administrator_id:
      created.administrator_id === null ? undefined : created.administrator_id,
    target_member_id: created.target_member_id,
    related_report_id:
      created.related_report_id === null
        ? undefined
        : created.related_report_id,
    content_topic_id:
      created.content_topic_id === null ? undefined : created.content_topic_id,
    content_reply_id:
      created.content_reply_id === null ? undefined : created.content_reply_id,
    action_type: typia.assert<
      | "hide_content"
      | "delete_content"
      | "issue_warning"
      | "suspend_user"
      | "ban_user"
      | "restore_content"
      | "dismiss_report"
    >(created.action_type),
    reason: created.reason,
    violation_category:
      created.violation_category === null
        ? undefined
        : typia.assert<
            | "other"
            | "personal_attack"
            | "hate_speech"
            | "misinformation"
            | "spam"
            | "offensive_language"
            | "off_topic"
            | "threats"
            | "doxxing"
            | "trolling"
          >(created.violation_category),
    content_snapshot:
      created.content_snapshot === null ? undefined : created.content_snapshot,
    is_reversed: created.is_reversed,
    reversed_at: created.reversed_at
      ? toISOStringSafe(created.reversed_at)
      : null,
    reversal_reason:
      created.reversal_reason === null ? undefined : created.reversal_reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
