import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // First verify the todo exists and belongs to the user
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existingTodo) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify ownership
  if (existingTodo.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own todos",
      403,
    );
  }

  // Perform hard deletion
  const deletedTodo = await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });

  // Return the deleted todo as confirmation
  return {
    id: deletedTodo.id,
    text: deletedTodo.text,
    completed: deletedTodo.completed,
    created_at: toISOStringSafe(deletedTodo.created_at),
    updated_at: toISOStringSafe(deletedTodo.updated_at),
    deleted_at: deletedTodo.deleted_at
      ? toISOStringSafe(deletedTodo.deleted_at)
      : undefined,
  };
}
