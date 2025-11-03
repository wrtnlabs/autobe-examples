import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminModerationActionsModerationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationAction.IUpdate;
}): Promise<IDiscussionBoardModerationAction> {
  const { admin, moderationActionId, body } = props;

  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
      where: { id: moderationActionId },
    });
  if (!moderationAction) {
    throw new HttpException("Moderation action not found", 404);
  }

  const updated =
    await MyGlobal.prisma.discussion_board_moderation_actions.update({
      where: { id: moderationActionId },
      data: {
        ...(body.action_reason !== undefined && {
          action_reason: body.action_reason,
        }),
        ...(body.affected_data_ref !== undefined && {
          affected_data_ref: body.affected_data_ref,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    admin_id: updated.admin_id,
    target_article_id:
      updated.target_article_id === null ? null : updated.target_article_id,
    target_comment_id:
      updated.target_comment_id === null ? null : updated.target_comment_id,
    abuse_report_id:
      updated.abuse_report_id === null ? null : updated.abuse_report_id,
    action_type: updated.action_type,
    action_reason: updated.action_reason,
    affected_data_ref: updated.affected_data_ref,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
