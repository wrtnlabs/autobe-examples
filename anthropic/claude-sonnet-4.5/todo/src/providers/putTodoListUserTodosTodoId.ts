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
  const { user, todoId, body } = props;

  // Fetch existing todo with ownership and soft-delete verification
  const existing = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }

  // MANDATORY ownership verification
  if (existing.todo_list_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own todo items",
      403,
    );
  }

  // Execute update with inline data definition for clear type errors
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: todoId },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      status: body.status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Convert DateTime fields to ISO strings for API response
  return {
    id: updated.id as string & tags.Format<"uuid">,
    todo_list_user_id: updated.todo_list_user_id as string &
      tags.Format<"uuid">,
    title: updated.title,
    description: updated.description !== null ? updated.description : undefined,
    status: updated.status as "complete" | "incomplete",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
