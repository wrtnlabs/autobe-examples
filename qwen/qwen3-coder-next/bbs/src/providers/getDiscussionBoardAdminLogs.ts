import { IDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemLog";
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

export async function getDiscussionBoardAdminLogs(props: {
  admin: AdminPayload;
}): Promise<IPageIDiscussionBoardSystemLog> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_system_logsWhereInput = {
    deleted_at: null,
  };
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_system_logs.count({ where: whereInput }),
  ]);
  return {
    data: logs.map((log) => ({
      id: log.id as string & tags.Format<"uuid">,
      event_type: log.event_type,
      severity: log.severity,
      description: log.description,
      actor_id: log.actor_id,
      target_id: log.target_id,
      target_type: log.target_type,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: toISOStringSafe(log.created_at),
      updated_at: toISOStringSafe(log.updated_at),
      actor: null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
