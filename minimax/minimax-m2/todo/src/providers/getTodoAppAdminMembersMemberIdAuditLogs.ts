import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function getTodoAppAdminMembersMemberIdAuditLogs(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IPageITodoAppAuditLog> {
  // Validate that member exists before fetching audit logs
  const member = await MyGlobal.prisma.todo_app_members.findUnique({
    where: { id: props.memberId },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  // Build where condition for audit logs involving the member
  const whereCondition = {
    deleted_at: null,
    OR: [
      { actor_member_id: props.memberId },
      { target_member_id: props.memberId },
      {
        target_todo_id: {
          in: (
            await MyGlobal.prisma.todo_app_todos.findMany({
              where: { member: { id: props.memberId } },
              select: { id: true },
            })
          ).map((todo) => todo.id),
        },
      },
    ],
  };

  const [auditLogs, total] = await Promise.all([
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

  // Convert database audit logs to API format
  const data = auditLogs.map((log) => ({
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
