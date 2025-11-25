import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersUserIdTodosTodoId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserTodo> {
  // Verify that the todo item exists and belongs to the specified user
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      todo_list_user_id: props.userId,
      deleted_at: null,
    },
  });

  // If the todo item doesn't exist, throw a 404 error
  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }

  // Return the todo item with properly formatted date fields
  return {
    id: todo.id,
    todo_list_user_id: todo.todo_list_user_id,
    title: todo.title,
    description: todo.description ?? undefined,
    completed: todo.completed,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
  };
}
