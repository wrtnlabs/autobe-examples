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

export async function getDiscussionBoardModeratorModerationActionsModerationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderationActionId } = props;

  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUniqueOrThrow(
      {
        where: {
          id: moderationActionId,
        },
      },
    );

  return {
    id: moderationAction.id as string & tags.Format<"uuid">,
    moderator_id:
      moderationAction.moderator_id === null
        ? null
        : (moderationAction.moderator_id as string & tags.Format<"uuid">),
    administrator_id:
      moderationAction.administrator_id === null
        ? null
        : (moderationAction.administrator_id as string & tags.Format<"uuid">),
    target_member_id: moderationAction.target_member_id as string &
      tags.Format<"uuid">,
    related_report_id:
      moderationAction.related_report_id === null
        ? null
        : (moderationAction.related_report_id as string & tags.Format<"uuid">),
    content_topic_id:
      moderationAction.content_topic_id === null
        ? null
        : (moderationAction.content_topic_id as string & tags.Format<"uuid">),
    content_reply_id:
      moderationAction.content_reply_id === null
        ? null
        : (moderationAction.content_reply_id as string & tags.Format<"uuid">),
    action_type: moderationAction.action_type as
      | "hide_content"
      | "delete_content"
      | "issue_warning"
      | "suspend_user"
      | "ban_user"
      | "restore_content"
      | "dismiss_report",
    reason: moderationAction.reason,
    violation_category:
      moderationAction.violation_category === null
        ? null
        : (moderationAction.violation_category as
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
    content_snapshot: moderationAction.content_snapshot,
    is_reversed: moderationAction.is_reversed,
    reversed_at: moderationAction.reversed_at
      ? toISOStringSafe(moderationAction.reversed_at)
      : null,
    reversal_reason: moderationAction.reversal_reason,
    created_at: toISOStringSafe(moderationAction.created_at),
    updated_at: toISOStringSafe(moderationAction.updated_at),
  };
}
