import { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
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

export async function getCommunityAdminAuditLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<ICommunityAuditLog> {
  const log = await MyGlobal.prisma.community_audit_logs.findUnique({
    where: { id: props.logId },
    select: {
      id: true,
      moderator_id: true,
      target_id: true,
      target_type: true,
      action_type: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!log) throw new HttpException("Audit log not found", 404);
  return {
    id: log.id,
    moderator_id: log.moderator_id,
    target_id: log.target_id,
    target_type: log.target_type,
    action_type: log.action_type,
    description: log.description,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
  };
}
