import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoAppTodoUserTodosTodoId(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const dbTodo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      // Use the correct foreign key field name inferred from the error type
      todo_user_id: props.todoUser.id,
      deleted_at: null,
    },
  });

  if (dbTodo === null) {
    throw new HttpException("Todo not found", 404);
  }

  // Load the associated status record using the foreign key field from the todo row
  const status = await MyGlobal.prisma.todo_app_todo_statuses.findUnique({
    where: {
      id: dbTodo.todo_status_id,
    },
  });

  if (status === null) {
    throw new HttpException("Todo status not found", 500);
  }

  return {
    id: dbTodo.id,
    title: dbTodo.title,
    description: dbTodo.description ?? null,
    due_date: dbTodo.due_date ? toISOStringSafe(dbTodo.due_date) : null,
    status: {
      id: status.id,
      code: status.code,
      label: status.label,
      is_default: status.is_default,
      is_active: status.is_active,
    },
    created_at: toISOStringSafe(dbTodo.created_at),
    updated_at: toISOStringSafe(dbTodo.updated_at),
    completed_at: dbTodo.completed_at
      ? toISOStringSafe(dbTodo.completed_at)
      : null,
    deleted_at: dbTodo.deleted_at ? toISOStringSafe(dbTodo.deleted_at) : null,
  };
}
