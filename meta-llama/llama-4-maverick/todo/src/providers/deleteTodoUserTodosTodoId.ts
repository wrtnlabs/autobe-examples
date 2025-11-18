import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoTodo> {
  // Step 1: Lookup todo by id
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: props.todoId },
  });
  if (todo === null) {
    throw new HttpException("Todo not found.", 404);
  }
  // Step 2: Ownership check
  if (todo.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: Todo does not belong to the authenticated user.",
      403,
    );
  }
  // Step 3: Prepare response (immutably) per ITodoTodo structure
  const result: ITodoTodo = {
    id: todo.id,
    user_id: todo.user_id,
    title: todo.title,
    description:
      typeof todo.description === "string"
        ? todo.description
        : todo.description === null
          ? null
          : undefined,
    due_date:
      typeof todo.due_date === "string"
        ? todo.due_date
        : todo.due_date === null
          ? null
          : undefined,
    priority:
      typeof todo.priority === "string"
        ? typia.assert<"low" | "medium" | "high">(todo.priority)
        : todo.priority === null
          ? null
          : undefined,
    is_completed: todo.is_completed,
    completed_at:
      typeof todo.completed_at === "string"
        ? todo.completed_at
        : todo.completed_at === null
          ? null
          : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  };
  // Step 4: Delete the todo
  await MyGlobal.prisma.todo_todos.delete({
    where: { id: props.todoId },
  });
  // Step 5: Return the deleted todo's pre-deletion data
  return result;
}
