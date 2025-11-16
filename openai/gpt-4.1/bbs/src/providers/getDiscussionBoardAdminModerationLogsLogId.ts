import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminModerationLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationLog> {
  const log = await MyGlobal.prisma.discussion_board_moderation_logs.findUnique(
    {
      where: { id: props.logId },
      include: {
        admin: true,
      },
    },
  );

  if (
    !log ||
    !log.admin ||
    log.admin.deleted_at !== null ||
    log.admin.is_active !== true ||
    log.admin.is_blocked !== false
  ) {
    throw new HttpException("Moderation log or admin not found", 404);
  }

  return {
    id: log.id,
    admin: {
      id: log.admin.id,
      display_name: log.admin.email,
    },
    target_type: log.target_type,
    target_id: log.target_id,
    action_code: log.action_code,
    note: log.note === null ? undefined : log.note,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
    deleted_at:
      typeof log.deleted_at === "undefined"
        ? undefined
        : log.deleted_at === null
          ? null
          : toISOStringSafe(log.deleted_at),
  };
}
