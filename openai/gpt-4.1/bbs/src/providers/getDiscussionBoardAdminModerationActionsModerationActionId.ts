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

export async function getDiscussionBoardAdminModerationActionsModerationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderationActionId } = props;
  const action =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
      where: { id: moderationActionId },
    });
  if (!action) {
    throw new HttpException("Moderation action not found", 404);
  }
  return {
    id: action.id,
    admin_id: action.admin_id,
    target_article_id:
      action.target_article_id === null
        ? null
        : (action.target_article_id ?? undefined),
    target_comment_id:
      action.target_comment_id === null
        ? null
        : (action.target_comment_id ?? undefined),
    abuse_report_id:
      action.abuse_report_id === null
        ? null
        : (action.abuse_report_id ?? undefined),
    action_type: action.action_type,
    action_reason: action.action_reason,
    affected_data_ref: action.affected_data_ref,
    created_at: toISOStringSafe(action.created_at),
    updated_at: toISOStringSafe(action.updated_at),
  };
}
