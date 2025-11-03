import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoTodo> {
  const row = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      id: props.todoId,
      todo_user_id: props.user.id,
    },
    include: {
      user: true,
    },
  });

  if (!row) {
    throw new HttpException("Not Found", 404);
  }

  const dueIso = row.due_date ? toISOStringSafe(row.due_date) : null;
  const dto = {
    id: row.id,
    title: row.title,
    description: row.description === null ? null : row.description,
    due_date: dueIso ? dueIso.slice(0, 10) : null,
    completed: row.completed,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    user: {
      id: row.user.id,
      email: row.user.email,
      created_at: toISOStringSafe(row.user.created_at),
      updated_at: toISOStringSafe(row.user.updated_at),
    },
  };

  return typia.assert<ITodoTodo>(dto);
}
