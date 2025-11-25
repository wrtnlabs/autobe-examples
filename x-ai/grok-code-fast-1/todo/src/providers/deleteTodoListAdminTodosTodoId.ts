import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminTodosTodoId(props: {
  admin: AdminPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the todo item (must exist)
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo || todo.deleted_at !== null) {
    throw new HttpException("Todo item not found or already deleted.", 404);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_todos.update({
      where: { id: props.todoId },
      data: { deleted_at: now, updated_at: now },
    }),
    MyGlobal.prisma.todo_list_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: props.admin.id,
        target_user_id: todo.todo_list_user_id,
        event_type: "todo_removed",
        event_time: now,
        details: `Admin deleted todo ID ${props.todoId}.`,
      },
    }),
  ]);
}
