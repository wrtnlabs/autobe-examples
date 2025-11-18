import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const { user, todoId, body } = props;
  // Find todo owned by this user
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: todoId,
      user_id: user.id,
    },
    include: { user: true },
  });
  if (!existing) {
    throw new HttpException("Todo not found or not owned by user", 404);
  }
  // Unique title enforcement: only check if title is provided and different
  if (body.title !== undefined && body.title !== existing.title) {
    const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        user_id: user.id,
        title: body.title,
        NOT: { id: todoId },
      },
    });
    if (duplicate) {
      throw new HttpException("Title must be unique for this user", 409);
    }
  }
  // Handle completed_at business logic
  let completedAt: Date | null = existing.completed_at;
  if (body.status !== undefined && body.status !== existing.status) {
    if (body.status === "complete") {
      completedAt = new Date();
    } else {
      completedAt = null;
    }
  }
  const now = new Date();
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: {
      id: todoId,
      user_id: user.id,
    },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      completed_at: completedAt,
      updated_at: now,
    },
    include: { user: true },
  });
  return {
    id: updated.id,
    user: {
      id: updated.user.id,
      email: updated.user.email,
    },
    title: updated.title,
    description: updated.description === null ? null : updated.description,
    status: typia.assert<"incomplete" | "complete">(updated.status),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
