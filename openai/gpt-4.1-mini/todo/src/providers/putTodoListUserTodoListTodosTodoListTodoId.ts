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

export async function putTodoListUserTodoListTodosTodoListTodoId(props: {
  user: UserPayload;
  todoListTodoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoListTodoId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Todo item not found", 404);
  }

  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoListTodoId },
    data: {
      title: props.body.title ?? existing.title,
      description:
        props.body.description !== undefined
          ? props.body.description
          : existing.description,
      is_complete: props.body.isComplete ?? existing.is_complete,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    todoListUserId: updated.todo_list_user_id,
    title: updated.title,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    isComplete: updated.is_complete,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt:
      updated.deleted_at === null
        ? null
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}
