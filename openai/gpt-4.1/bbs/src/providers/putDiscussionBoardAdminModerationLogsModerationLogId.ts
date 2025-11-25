import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminModerationLogsModerationLogId(props: {
  admin: AdminPayload;
  moderationLogId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationLog.IUpdate;
}): Promise<IDiscussionBoardModerationLog> {
  const existing =
    await MyGlobal.prisma.discussion_board_moderation_logs.findUnique({
      where: { id: props.moderationLogId },
    });
  if (!existing) {
    throw new HttpException("Moderation log not found", 404);
  }

  const updated = await MyGlobal.prisma.discussion_board_moderation_logs.update(
    {
      where: { id: props.moderationLogId },
      data: {
        ...(props.body.reason !== undefined && { reason: props.body.reason }),
        ...(props.body.outcome !== undefined && {
          outcome: props.body.outcome,
        }),
      },
    },
  );

  return {
    id: updated.id,
    target_type: updated.target_type,
    target_id: updated.target_id,
    action: updated.action,
    reason: updated.reason,
    outcome: updated.outcome,
    created_at: toISOStringSafe(updated.created_at),
    admin_id: updated.admin_id,
  };
}
