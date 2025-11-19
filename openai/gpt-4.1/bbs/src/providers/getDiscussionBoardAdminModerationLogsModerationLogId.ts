import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminModerationLogsModerationLogId(props: {
  admin: AdminPayload;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationLog> {
  const moderationLog =
    await MyGlobal.prisma.discussion_board_moderation_logs.findUnique({
      where: { id: props.moderationLogId },
    });

  if (!moderationLog) {
    throw new HttpException("Moderation log not found", 404);
  }

  return {
    id: moderationLog.id,
    target_type: moderationLog.target_type,
    target_id: moderationLog.target_id,
    action: moderationLog.action,
    reason: moderationLog.reason,
    outcome: moderationLog.outcome,
    created_at: toISOStringSafe(moderationLog.created_at),
    admin_id: moderationLog.admin_id,
  };
}
