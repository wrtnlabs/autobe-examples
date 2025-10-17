import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const { user, todoId, body } = props;

  // Ensure the target exists and is not soft-deleted
  const existing = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: { id: todoId, deleted_at: null },
  });

  if (!existing) {
    throw new HttpException("Not Found", 404);
  }

  // Ownership check
  if (existing.user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own todos",
      403,
    );
  }

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Perform update with inline data object
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: todoId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.position !== undefined && { position: body.position }),
      ...(body.is_completed !== undefined && {
        is_completed: body.is_completed,
      }),
      ...(body.is_completed !== undefined && {
        completed_at: body.is_completed ? now : null,
      }),
      updated_at: now,
    },
  });

  // Map Prisma result to API DTO, converting Date fields to ISO strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    user_id: updated.user_id as string & tags.Format<"uuid">,
    title: updated.title,
    description: updated.description === null ? null : updated.description,
    is_completed: updated.is_completed,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    position:
      updated.position === null
        ? null
        : (updated.position as number & tags.Type<"int32">),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies ITodoAppTodo;
}
