import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getDiscussionBoardAdministratorModerationActionsModerationActionId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderationActionId } = props;

  const action =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUniqueOrThrow(
      {
        where: { id: moderationActionId },
      },
    );

  return {
    id: action.id,
    moderator_id: action.moderator_id ?? undefined,
    administrator_id: action.administrator_id ?? undefined,
    target_member_id: action.target_member_id,
    related_report_id: action.related_report_id ?? undefined,
    content_topic_id: action.content_topic_id ?? undefined,
    content_reply_id: action.content_reply_id ?? undefined,
    action_type: action.action_type as
      | "hide_content"
      | "delete_content"
      | "issue_warning"
      | "suspend_user"
      | "ban_user"
      | "restore_content"
      | "dismiss_report",
    reason: action.reason,
    violation_category: action.violation_category
      ? (action.violation_category as
          | "personal_attack"
          | "hate_speech"
          | "misinformation"
          | "spam"
          | "offensive_language"
          | "off_topic"
          | "threats"
          | "doxxing"
          | "trolling"
          | "other")
      : undefined,
    content_snapshot: action.content_snapshot ?? undefined,
    is_reversed: action.is_reversed,
    reversed_at: action.reversed_at
      ? toISOStringSafe(action.reversed_at)
      : undefined,
    reversal_reason: action.reversal_reason ?? undefined,
    created_at: toISOStringSafe(action.created_at),
    updated_at: toISOStringSafe(action.updated_at),
  };
}
