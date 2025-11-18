import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  // 1. Find the todo
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo) {
    throw new HttpException("Todo not found.", 404);
  }

  // 2. Check admin privilege
  const isAdmin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: { id: props.user.id },
  });

  const isOwner = todo.user_id === props.user.id;
  if (!isOwner && !isAdmin) {
    throw new HttpException("Not authorized to hard-delete this todo.", 403);
  }

  // 3. Delete the todo (hard delete)
  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: props.todoId },
  });

  // 4. Return the deleted info (construct ITodoListTodo using the removed record)
  return {
    id: todo.id,
    description: todo.description,
    completed: todo.completed,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
  };
}
