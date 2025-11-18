import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
    include: {
      user: true,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }

  const user = todo.user;

  const mappedUser: ITodoListUser.ISummary = {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    disabled_at: user.disabled_at
      ? toISOStringSafe(user.disabled_at)
      : undefined,
  };

  return {
    id: todo.id,
    user: mappedUser,
    title: todo.title,
    description:
      typeof todo.description === "string"
        ? todo.description
        : todo.description === null
          ? null
          : undefined,
    status: typia.assert<"pending" | "completed" | "deleted">(todo.status),
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
  };
}
