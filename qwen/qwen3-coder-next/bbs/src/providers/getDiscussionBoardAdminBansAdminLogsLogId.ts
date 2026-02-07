import { IDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminBansAdminLogsLogId(props: {
  admin: AdminPayload;
  logId: string;
}): Promise<IDiscussionBoardBansAdminLog> {
  const log = await MyGlobal.prisma.discussion_board_bans_admin_logs.findUnique(
    {
      where: { id: props.logId },
    },
  );
  if (!log) {
    throw new HttpException("Log not found", 404);
  }
  return {
    id: log.id,
    admin_id: log.admin_id,
    user_id: log.user_id,
    action_type: log.action_type,
    ban_reason: log.ban_reason === null ? undefined : log.ban_reason,
    ban_start_time: toISOStringSafe(log.ban_start_time),
    ban_end_time:
      log.ban_end_time === null ? undefined : toISOStringSafe(log.ban_end_time),
    unban_reason: log.unban_reason === null ? undefined : log.unban_reason,
    created_at: toISOStringSafe(log.created_at),
    notes: log.notes === null ? undefined : log.notes,
  };
}
