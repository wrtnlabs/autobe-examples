import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify todo exists and user owns it
  const todo = await MyGlobal.prisma.todo_app_todo.findUnique({
    where: { id: props.todoId },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify user owns the todo
  if (todo.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Delete todo and create audit log in transaction
  await MyGlobal.prisma.$transaction([
    // Delete the todo
    MyGlobal.prisma.todo_app_todo.delete({
      where: { id: props.todoId },
    }),
    // Create audit log entry
    MyGlobal.prisma.todo_app_audit_log.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        action_type: "todo_deleted",
        resource_type: "todo",
        resource_id: props.todoId,
        actor_type: "user",
        user_id: props.user.id,
        todo_app_todo_id: props.todoId,
        status: "success",
        old_value: null,
        new_value: null,
        error_message: null,
        ip_address: null,
        user_agent: null,
        details: null,
        created_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
}
