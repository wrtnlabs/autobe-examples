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

export async function getTodoAppAdminAdministratorsAdministratorIdAuditLogs(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
  query?: {
    page?: number;
    limit?: number;
  };
}): Promise<IPageITodoAppAuditLog> {
  // Extract pagination parameters with defaults
  const page = props.query?.page ?? 1;
  const limit = props.query?.limit ?? 100;
  const skip = (page - 1) * limit;

  // Verify the administrator exists and is active
  const targetAdmin = await MyGlobal.prisma.todo_app_administrators.findFirst({
    where: {
      id: props.administratorId,
      deleted_at: null,
    },
  });

  if (!targetAdmin) {
    throw new HttpException("Administrator not found", 404);
  }

  // Build query conditions for audit logs
  // Include logs where administrator is either the actor or target
  const whereCondition = {
    OR: [
      // Logs where this administrator performed the action
      { actor_administrator_id: props.administratorId },
      // Logs where this administrator is the target
      { target_member_id: props.administratorId },
    ],
    deleted_at: null,
  };

  // Execute queries in parallel for performance
  const [auditLogs, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_audit_logs.count({
      where: whereCondition,
    }),
  ]);

  // Transform audit logs to API format
  const transformedLogs = auditLogs.map((log) => ({
    id: log.id,
    actor_member_id: log.actor_member_id ?? undefined,
    actor_administrator_id: log.actor_administrator_id ?? undefined,
    target_member_id: log.target_member_id ?? undefined,
    target_todo_id: log.target_todo_id ?? undefined,
    action_type: log.action_type,
    action_description: log.action_description,
    entity_type: log.entity_type,
    entity_id: log.entity_id ?? undefined,
    old_values: log.old_values ?? undefined,
    new_values: log.new_values ?? undefined,
    ip_address: log.ip_address ?? undefined,
    user_agent: log.user_agent ?? undefined,
    session_id: log.session_id ?? undefined,
    request_id: log.request_id ?? undefined,
    severity_level: log.severity_level,
    created_at: toISOStringSafe(log.created_at),
    updated_at: log.updated_at ? toISOStringSafe(log.updated_at) : undefined,
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : undefined,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: transformedLogs,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalPages,
    },
  };
}
