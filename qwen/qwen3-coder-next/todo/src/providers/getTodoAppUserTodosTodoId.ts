import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    select: {
      id: true,
      todo_app_user_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      title: true,
      description: true,
      start_date: true,
      due_date: true,
      is_completed: true,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  return {
    id: todo.id,
    user_id: todo.todo_app_user_id,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
    deleted_at: todo.deleted_at ? todo.deleted_at : undefined,
    title: todo.title,
    description: todo.description,
    start_date: todo.start_date,
    due_date: todo.due_date,
    is_completed: todo.is_completed,
  };
}
