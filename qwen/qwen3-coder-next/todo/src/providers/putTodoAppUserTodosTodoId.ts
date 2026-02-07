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

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    data: {
      updated_at: new Date(),
    },
  });
  return {
    id: updatedTodo.id,
    todo_app_user_id: updatedTodo.todo_app_user_id,
    created_at: toISOStringSafe(updatedTodo.created_at),
    updated_at: toISOStringSafe(updatedTodo.updated_at),
    deleted_at: updatedTodo.deleted_at
      ? toISOStringSafe(updatedTodo.deleted_at)
      : null,
    title: updatedTodo.title,
    description: updatedTodo.description,
    start_date: updatedTodo.start_date
      ? toISOStringSafe(updatedTodo.start_date)
      : null,
    due_date: updatedTodo.due_date
      ? toISOStringSafe(updatedTodo.due_date)
      : null,
    is_completed: updatedTodo.is_completed,
  };
}
