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

export async function getTodoListUserTodoListTodosTodoListTodoId(props: {
  user: UserPayload;
  todoListTodoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoListTodoId,
      todo_list_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (todo === null) {
    throw new HttpException("Todo item not found", 404);
  }

  return {
    id: todo.id,
    todoListUserId: todo.todo_list_user_id,
    title: todo.title,
    description: todo.description ?? undefined,
    isComplete: todo.is_complete,
    createdAt: toISOStringSafe(todo.created_at),
    updatedAt: toISOStringSafe(todo.updated_at),
    deletedAt:
      todo.deleted_at !== null ? toISOStringSafe(todo.deleted_at) : null,
  };
}
