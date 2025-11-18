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

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // 1. Ownership-enforced fetch
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
    },
  });
  if (!existing) {
    throw new HttpException("Todo not found or not owned by this user.", 404);
  }

  // 2. Build update data (only fields specified)
  const updateData: Record<string, unknown> = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.completed !== undefined && {
      completed: props.body.completed,
    }),
    ...(props.body.due_date !== undefined && { due_date: props.body.due_date }),
    updated_at: toISOStringSafe(new Date()),
  };

  // 3. Perform the update
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
    },
    data: updateData,
  });

  // 4. Return DTO with schema/format conversions
  return {
    id: updated.id,
    title: updated.title,
    description:
      typeof updated.description === "string"
        ? updated.description
        : updated.description === null
          ? null
          : undefined,
    completed: updated.completed,
    due_date:
      typeof updated.due_date === "string"
        ? updated.due_date
        : updated.due_date === null
          ? null
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    todo_list_user_id: updated.todo_list_user_id,
  };
}
