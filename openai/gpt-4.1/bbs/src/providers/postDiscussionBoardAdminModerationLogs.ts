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

export async function postDiscussionBoardAdminModerationLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationLog.ICreate;
}): Promise<IDiscussionBoardModerationLog> {
  try {
    const created =
      await MyGlobal.prisma.discussion_board_moderation_logs.create({
        data: {
          id: v4(),
          target_type: props.body.target_type,
          target_id: props.body.target_id,
          action: props.body.action,
          reason: props.body.reason,
          outcome: props.body.outcome,
          created_at: props.body.created_at,
          admin_id: props.admin.id,
        },
      });
    return {
      id: created.id,
      target_type: created.target_type,
      target_id: created.target_id,
      action: created.action,
      reason: created.reason,
      outcome: created.outcome,
      created_at: toISOStringSafe(created.created_at),
      admin_id: created.admin_id,
    };
  } catch (error) {
    throw new HttpException(
      error instanceof Error
        ? error.message
        : "Failed to create moderation log entry",
      400,
    );
  }
}
