import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
    include: {
      user: true,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  return {
    id: todo.id,
    description: todo.description,
    due_date: todo.due_date === null ? null : toISOStringSafe(todo.due_date),
    completed: todo.completed,
    completed_at:
      todo.completed_at === null ? null : toISOStringSafe(todo.completed_at),
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    user: {
      id: todo.user.id,
    },
  };
}
