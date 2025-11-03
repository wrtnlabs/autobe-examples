import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoAppTodoUserListsListId(props: {
  todoUser: TodouserPayload;
  listId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { todoUser, listId } = props;

  // Locate active list (must not already be soft-deleted)
  const list = await MyGlobal.prisma.todo_app_lists.findFirst({
    where: { id: listId, deleted_at: null },
  });

  if (list === null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the owner may perform soft-delete (admin payload not provided)
  if (list.todo_app_todouser_id !== todoUser.id) {
    throw new HttpException(
      "Unauthorized: You are not the owner of this list",
      403,
    );
  }

  // Prepare ISO timestamp string for DB fields
  const now = toISOStringSafe(new Date());

  // Perform soft-delete by setting deleted_at
  await MyGlobal.prisma.todo_app_lists.update({
    where: { id: listId },
    data: { deleted_at: now },
  });

  // Create audit log entry
  await MyGlobal.prisma.todo_app_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: todoUser.id,
      todo_app_todouser_session_id: todoUser.session_id,
      todo_app_list_id: listId,
      event_type: "delete",
      target_type: "list",
      target_id: listId,
      details: `Soft-deleted todo list ${listId} by user ${todoUser.id}`,
      created_at: now,
      updated_at: now,
    },
  });

  return;
}
