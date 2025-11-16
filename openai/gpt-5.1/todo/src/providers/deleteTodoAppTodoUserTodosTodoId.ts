import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoAppTodoUserTodosTodoId(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Look up the todo by its primary key.
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
    },
  });

  // If the todo does not exist at all, treat delete as idempotent and succeed.
  if (existingTodo === null) {
    return;
  }

  // Enforce ownership: only the owning todo user can delete this todo.
  // To avoid leaking information about other users' data, respond with
  // a not-found error when the todo is not owned by the caller.
  if (existingTodo.todo_user_id !== props.todoUser.id) {
    throw new HttpException("Todo not found", 404);
  }

  // Perform a hard delete of the todo record.
  await MyGlobal.prisma.todo_app_todos.delete({
    where: {
      id: props.todoId,
    },
  });
}
