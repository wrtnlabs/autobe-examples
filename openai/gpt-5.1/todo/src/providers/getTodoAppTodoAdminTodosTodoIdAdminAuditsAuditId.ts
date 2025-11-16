import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminAudit";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function getTodoAppTodoAdminTodosTodoIdAdminAuditsAuditId(props: {
  todoAdmin: TodoadminPayload;
  todoId: string & tags.Format<"uuid">;
  auditId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoAdminAudit> {
  const auditRecord =
    await MyGlobal.prisma.todo_app_todo_admin_audits.findFirst({
      where: {
        id: props.auditId,
        todo_app_todo_id: props.todoId,
      },
      include: {
        todo: {
          include: {
            status: true,
          },
        },
        admin: true,
      },
    });

  if (auditRecord === null) {
    throw new HttpException("Audit not found", 404);
  }

  const todoEntity = auditRecord.todo;
  const statusEntity = todoEntity.status;
  const adminEntity = auditRecord.admin;

  const todoSummary: ITodoAppTodo.ISummary = {
    id: todoEntity.id,
    title: todoEntity.title,
    status: statusEntity.code,
    statusInfo: {
      id: statusEntity.id,
      code: statusEntity.code,
      label: statusEntity.label,
      is_default: statusEntity.is_default,
      is_active: statusEntity.is_active,
    },
    due_date:
      todoEntity.due_date !== null
        ? toISOStringSafe(todoEntity.due_date)
        : undefined,
    created_at: toISOStringSafe(todoEntity.created_at),
    updated_at: toISOStringSafe(todoEntity.updated_at),
    completed_at:
      todoEntity.completed_at !== null
        ? toISOStringSafe(todoEntity.completed_at)
        : undefined,
  };

  const adminSummary: ITodoAppTodoAdmin.ISummary = {
    id: adminEntity.id,
    email: adminEntity.email,
    display_name:
      adminEntity.display_name !== null ? adminEntity.display_name : undefined,
    status: adminEntity.status,
    last_login_at:
      adminEntity.last_login_at !== null
        ? toISOStringSafe(adminEntity.last_login_at)
        : undefined,
    created_at: toISOStringSafe(adminEntity.created_at),
    updated_at: toISOStringSafe(adminEntity.updated_at),
  };

  const result: ITodoAppTodoAdminAudit = {
    id: auditRecord.id,
    action: auditRecord.action,
    field_name: auditRecord.field_name,
    previous_value: auditRecord.previous_value,
    new_value: auditRecord.new_value,
    reason: auditRecord.reason,
    created_at: toISOStringSafe(auditRecord.created_at),
    todo: todoSummary,
    admin: adminSummary,
  };

  return result;
}
