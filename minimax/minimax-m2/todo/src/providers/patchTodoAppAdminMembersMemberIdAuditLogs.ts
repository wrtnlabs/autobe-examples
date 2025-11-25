import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminMembersMemberIdAuditLogs(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  body: ITodoAppAuditLog.IRequest;
}): Promise<IPageITodoAppAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build comprehensive where condition for member-related audit logs
  const whereConditions: any[] = [
    // Actions performed BY the member (as actor)
    { actor_member_id: props.memberId },
    // Actions performed ON the member (as target)
    { target_member_id: props.memberId },
  ];

  // Add todo-related actions if not already included in target filters
  if (!props.body.target_todo_id) {
    const memberTodos = await MyGlobal.prisma.todo_app_todos.findMany({
      where: { todo_app_member_id: props.memberId },
      select: { id: true },
    });
    if (memberTodos.length > 0) {
      whereConditions.push({
        target_todo_id: { in: memberTodos.map((todo) => todo.id) },
      });
    }
  }

  // Apply additional filters
  const filterConditions = {
    deleted_at: props.body.include_deleted ? undefined : null,
    action_type: props.body.action_type,
    entity_type: props.body.entity_type,
    severity_level: props.body.severity_level,
    actor_administrator_id: props.body.actor_administrator_id,
    target_todo_id: props.body.target_todo_id,
    // Date range filters
    ...(() => {
      if (!props.body.created_after && !props.body.created_before) return {};
      return {
        created_at: {
          ...(props.body.created_after && { gte: props.body.created_after }),
          ...(props.body.created_before && { lte: props.body.created_before }),
        },
      };
    })(),
    // Full-text search across action descriptions and user agents
    ...(props.body.search && {
      OR: [
        { action_description: { contains: props.body.search } },
        { user_agent: { contains: props.body.search } },
      ],
    }),
  };

  // Combine member involvement conditions with filters
  const finalWhereCondition = {
    AND: [{ OR: whereConditions }, filterConditions],
  };

  // Build order by clause
  const orderBy = {
    [props.body.order_by ?? "created_at"]: props.body.order_direction ?? "desc",
  };

  // Execute concurrent queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_audit_logs.findMany({
      where: finalWhereCondition,
      skip,
      take: limit,
      orderBy,
      // Select only fields needed for summary view
      select: {
        id: true,
        actor_member_id: true,
        actor_administrator_id: true,
        action_type: true,
        entity_type: true,
        target_member_id: true,
        target_todo_id: true,
        old_values: true,
        new_values: true,
        severity_level: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_audit_logs.count({ where: finalWhereCondition }),
  ]);

  return {
    data: data.map((audit) => ({
      id: audit.id,
      actor_member_id: audit.actor_member_id ?? undefined,
      actor_administrator_id: audit.actor_administrator_id ?? undefined,
      action_type: audit.action_type,
      entity_type: audit.entity_type ?? undefined,
      target_member_id: audit.target_member_id ?? undefined,
      target_todo_id: audit.target_todo_id ?? undefined,
      old_values: audit.old_values ?? undefined,
      new_values: audit.new_values ?? undefined,
      severity_level: audit.severity_level,
      created_at: toISOStringSafe(audit.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
