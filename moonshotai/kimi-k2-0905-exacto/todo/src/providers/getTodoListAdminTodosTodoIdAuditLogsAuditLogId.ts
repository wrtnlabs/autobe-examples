import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminTodosTodoIdAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodoAuditLog> {
  const log = await MyGlobal.prisma.todo_list_todo_audit_logs.findFirst({
    where: {
      id: props.auditLogId,
      todo_id: props.todoId,
    },
  });
  if (!log) {
    throw new HttpException(
      "Audit log entry not found for the specified todo item.",
      404,
    );
  }
  return {
    id: log.id,
    todo_id: log.todo_id,
    actor_user_id: log.actor_user_id === null ? undefined : log.actor_user_id,
    actor_admin_id:
      log.actor_admin_id === null ? undefined : log.actor_admin_id,
    action: log.action,
    context: log.context === null ? undefined : log.context,
    created_at: toISOStringSafe(log.created_at),
  };
}
