import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ITodoListAuditLog> {
  const log = await MyGlobal.prisma.todo_list_audit_logs.findUnique({
    where: { id: props.auditLogId },
  });
  if (!log) {
    throw new HttpException("Audit log not found", 404);
  }
  return {
    id: log.id,
    actor_user_id: log.actor_user_id ?? undefined,
    actor_admin_id: log.actor_admin_id ?? undefined,
    actor_user_session_id: log.actor_user_session_id ?? undefined,
    actor_admin_session_id: log.actor_admin_session_id ?? undefined,
    affected_todo_id: log.affected_todo_id ?? undefined,
    event_action: log.event_action,
    event_status: log.event_status,
    event_context: log.event_context ?? undefined,
    ip_address: log.ip_address ?? undefined,
    user_agent: log.user_agent ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
