import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAuditLog> {
  const log =
    await MyGlobal.prisma.community_platform_audit_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
    });
  return {
    id: log.id,
    actor_type: log.actor_type,
    actor_id: log.actor_id,
    action_type: log.action_type,
    target_table: log.target_table,
    target_id: log.target_id ?? undefined,
    details: log.details ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
