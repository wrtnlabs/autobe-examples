import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminTodosTodoIdAdminAuditLogsId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListAdminAuditLog> {
  const auditLog = await MyGlobal.prisma.todo_list_admin_audit_logs.findFirst({
    where: {
      id: props.id,
      todo_id: props.todoId,
    },
  });

  if (!auditLog) {
    throw new HttpException(
      "Audit log entry not found or does not belong to specified Todo.",
      404,
    );
  }

  return {
    id: auditLog.id,
    admin_id: auditLog.admin_id,
    user_id: auditLog.user_id === null ? undefined : auditLog.user_id,
    todo_id: auditLog.todo_id === null ? undefined : auditLog.todo_id,
    action_type: auditLog.action_type,
    request_context:
      auditLog.request_context === null ? undefined : auditLog.request_context,
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
