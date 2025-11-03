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
  const record =
    await MyGlobal.prisma.community_platform_audit_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
      select: {
        id: true,
        actor_type: true,
        actor_id: true,
        action: true,
        target_type: true,
        target_id: true,
        metadata: true,
        created_at: true,
      },
    });
  return {
    id: record.id,
    actor_type: record.actor_type,
    actor_id: record.actor_id,
    action: record.action,
    target_type: record.target_type,
    target_id: record.target_id,
    metadata: record.metadata,
    created_at: toISOStringSafe(record.created_at),
  };
}
