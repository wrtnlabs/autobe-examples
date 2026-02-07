import { IDiscussionBoardSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardSuperAdminLogsLogId(props: {
  superAdmin: SuperadminPayload;
  logId: string;
}): Promise<IDiscussionBoardSystemLog> {
  const log = await MyGlobal.prisma.discussion_board_system_logs.findUnique({
    where: {
      id: props.logId,
      deleted_at: null,
    },
    select: {
      id: true,
      actor_id: true,
      actor_session_id: true,
      event_type: true,
      severity: true,
      description: true,
      target_type: true,
      target_id: true,
      old_values: true,
      new_values: true,
      ip_address: true,
      user_agent: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!log) {
    throw new HttpException("System log not found", 404);
  }
  return {
    id: log.id,
    actor_id: log.actor_id,
    actor_session_id: log.actor_session_id,
    event_type: log.event_type,
    severity: log.severity,
    description: log.description,
    target_type: log.target_type,
    target_id: log.target_id,
    old_values: log.old_values,
    new_values: log.new_values,
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : null,
  };
}
