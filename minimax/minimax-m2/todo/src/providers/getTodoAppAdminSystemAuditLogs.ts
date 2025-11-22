import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminSystemAuditLogs(props: {
  admin: AdminPayload;
}): Promise<IPageITodoAppAuditLog> {
  // Extract pagination parameters from request
  const request = props as any;
  const page = Number(request.query?.page ?? 1);
  const limit = Number(request.query?.limit ?? 100);
  const skip = (page - 1) * limit;

  // Retrieve audit logs with pagination, excluding soft-deleted entries
  const [auditLogs, total] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.findMany({
      where: {
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_audit_logs.count({
      where: {
        deleted_at: null,
      },
    }),
  ]);

  // Map database results to API DTO format
  const data = auditLogs.map((log) => ({
    id: log.id,
    actor_member_id:
      log.actor_member_id !== null
        ? (log.actor_member_id satisfies string as string)
        : undefined,
    actor_administrator_id:
      log.actor_administrator_id !== null
        ? (log.actor_administrator_id satisfies string as string)
        : undefined,
    target_member_id:
      log.target_member_id !== null
        ? (log.target_member_id satisfies string as string)
        : undefined,
    target_todo_id:
      log.target_todo_id !== null
        ? (log.target_todo_id satisfies string as string)
        : undefined,
    action_type: log.action_type,
    action_description: log.action_description,
    entity_type: log.entity_type,
    entity_id:
      log.entity_id !== null
        ? (log.entity_id satisfies string as string)
        : undefined,
    old_values:
      log.old_values !== null
        ? (log.old_values satisfies string as string)
        : undefined,
    new_values:
      log.new_values !== null
        ? (log.new_values satisfies string as string)
        : undefined,
    ip_address:
      log.ip_address !== null
        ? (log.ip_address satisfies string as string)
        : undefined,
    user_agent:
      log.user_agent !== null
        ? (log.user_agent satisfies string as string)
        : undefined,
    session_id:
      log.session_id !== null
        ? (log.session_id satisfies string as string)
        : undefined,
    request_id:
      log.request_id !== null
        ? (log.request_id satisfies string as string)
        : undefined,
    severity_level: log.severity_level,
    created_at: toISOStringSafe(log.created_at),
    updated_at: log.updated_at ? toISOStringSafe(log.updated_at) : undefined,
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : undefined,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
