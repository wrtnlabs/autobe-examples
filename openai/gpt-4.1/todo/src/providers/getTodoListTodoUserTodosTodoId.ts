import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoListTodoUserTodosTodoId(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const record = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_todouser_id: props.todoUser.id,
    },
  });
  if (!record) {
    throw new HttpException("Todo not found", 404);
  }
  return {
    id: record.id,
    todo_list_todouser_id: record.todo_list_todouser_id,
    title: record.title,
    description: record.description ?? null,
    is_completed: record.is_completed,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    completed_at: record.completed_at
      ? toISOStringSafe(record.completed_at)
      : null,
  };
}
