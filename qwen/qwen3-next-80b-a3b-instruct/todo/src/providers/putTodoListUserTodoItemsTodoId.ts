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

export async function putTodoListUserTodoItemsTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existing) {
    throw new HttpException("Todo item not found", 404);
  }

  if (existing.todo_list_users_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Update the todo item with the new title string
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      title: props.body,
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      title: true,
      completed: true,
      created_at: true,
      updated_at: true,
      todo_list_users_id: true,
    },
  });

  // Fetch the associated user explicitly
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: updated.todo_list_users_id },
  });

  if (!user) {
    throw new HttpException("Associated user not found", 500);
  }

  return {
    id: updated.id,
    title: updated.title,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    todo_list_users_id: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
    },
  };
}
