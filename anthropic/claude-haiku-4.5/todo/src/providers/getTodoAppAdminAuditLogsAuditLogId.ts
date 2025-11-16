import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAuditLog> {
  const auditLog = await MyGlobal.prisma.todo_app_audit_log.findUnique({
    where: {
      id: props.auditLogId,
    },
  });

  if (!auditLog) {
    throw new HttpException("Audit log not found", 404);
  }

  return {
    id: auditLog.id,
    action_type: auditLog.action_type,
    resource_type: auditLog.resource_type,
    resource_id:
      auditLog.resource_id === null ? undefined : auditLog.resource_id,
    actor_type: auditLog.actor_type,
    old_value: auditLog.old_value ?? undefined,
    new_value: auditLog.new_value ?? undefined,
    status: auditLog.status,
    error_message: auditLog.error_message ?? undefined,
    ip_address: auditLog.ip_address ?? undefined,
    user_agent: auditLog.user_agent ?? undefined,
    details: auditLog.details ?? undefined,
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
