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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminBansAdminLogs(props: {
  superAdmin: SuperadminPayload;
}): Promise<IPageIDiscussionBoardBansAdminLog.ISummary> {
  const page = 1; // Default page
  const limit = 50; // Default limit
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_bans_admin_logs.findMany({
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
  });
  const total = await MyGlobal.prisma.discussion_board_bans_admin_logs.count();
  return {
    data: data.map((log) => ({
      id: log.id as string & tags.Format<"uuid">,
      admin_id: log.admin_id as string & tags.Format<"uuid">,
      user_id: log.user_id as string & tags.Format<"uuid">,
      action_type: log.action_type,
      ban_reason: log.ban_reason === null ? undefined : log.ban_reason,
      ban_start_time: toISOStringSafe(log.ban_start_time) as string &
        tags.Format<"date-time">,
      ban_end_time: log.ban_end_time
        ? (toISOStringSafe(log.ban_end_time) as string &
            tags.Format<"date-time">)
        : null,
      unban_reason: log.unban_reason === null ? undefined : log.unban_reason,
      created_at: toISOStringSafe(log.created_at) as string &
        tags.Format<"date-time">,
      notes: log.notes === null ? undefined : log.notes,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageIDiscussionBoardBansAdminLog.ISummary;
}
