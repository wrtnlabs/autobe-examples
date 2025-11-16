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
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden - you do not own this todo", 403);
  }

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined ? { title: props.body.title } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.is_completed !== undefined
        ? { is_completed: props.body.is_completed }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    is_completed: updated.is_completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
