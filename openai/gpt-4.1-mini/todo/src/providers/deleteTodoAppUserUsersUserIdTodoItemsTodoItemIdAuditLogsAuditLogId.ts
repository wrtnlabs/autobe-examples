import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserIdTodoItemsTodoItemIdAuditLogsAuditLogId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoItemId: string & tags.Format<"uuid">;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const auditLog =
    await MyGlobal.prisma.todo_app_todo_item_audit_logs.findUnique({
      where: { id: props.auditLogId },
    });
  if (!auditLog) {
    throw new HttpException("Audit log not found", 404);
  }
  if (auditLog.todo_app_todo_item_id !== props.todoItemId) {
    throw new HttpException("Audit log does not belong to this todo item", 400);
  }
  const todoItem = await MyGlobal.prisma.todo_app_todo_items.findUnique({
    where: { id: props.todoItemId },
  });
  if (!todoItem) {
    throw new HttpException("Todo item not found", 404);
  }
  if (todoItem.todo_app_user_id !== props.userId) {
    throw new HttpException("Todo item does not belong to this user", 400);
  }
  if (props.user.id !== props.userId) {
    // Additional admin authorization can be enforced here if needed
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.todo_app_todo_item_audit_logs.delete({
    where: { id: props.auditLogId },
  });
}
