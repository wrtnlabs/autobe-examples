import { IDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBansAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAdminLog";
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

export async function getDiscussionBoardAdminBansAdminLogs(props: {
  admin: AdminPayload;
}): Promise<IPageIDiscussionBoardBansAdminLog> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_bans_admin_logs.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.discussion_board_bans_admin_logs.count();
  return {
    data: data.map((record) => ({
      id: record.id,
      admin_id: record.admin_id,
      user_id: record.user_id,
      action_type: record.action_type,
      ban_reason: record.ban_reason === null ? undefined : record.ban_reason,
      ban_start_time:
        record.ban_start_time === null
          ? undefined
          : toISOStringSafe(record.ban_start_time),
      ban_end_time:
        record.ban_end_time === null
          ? null
          : toISOStringSafe(record.ban_end_time),
      unban_reason:
        record.unban_reason === null ? undefined : record.unban_reason,
      created_at: toISOStringSafe(record.created_at),
      notes: record.notes === null ? undefined : record.notes,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
