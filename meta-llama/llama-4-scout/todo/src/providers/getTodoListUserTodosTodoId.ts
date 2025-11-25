import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }
  return {
    id: todo.id,
    todo_list_user_id: todo.todo_list_user_id,
    title: todo.title,
    description: todo.description === null ? undefined : todo.description,
    due_date:
      todo.due_date === null ? undefined : toISOStringSafe(todo.due_date),
    is_completed: todo.is_completed,
    completed_at:
      todo.completed_at === null
        ? undefined
        : toISOStringSafe(todo.completed_at),
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  };
}
