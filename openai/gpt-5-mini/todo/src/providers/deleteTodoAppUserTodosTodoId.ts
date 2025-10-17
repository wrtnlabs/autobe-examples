import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoId } = props;

  // Fetch minimal fields to verify ownership and current deleted state
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: todoId },
    select: { id: true, user_id: true, deleted_at: true },
  });

  if (!todo) {
    throw new HttpException("Not Found: Todo not found", 404);
  }

  if (todo.user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own todos",
      403,
    );
  }

  // Idempotent: if already soft-deleted, succeed (no-op)
  if (todo.deleted_at) return;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: todoId },
    data: {
      deleted_at: now,
    },
  });
}
