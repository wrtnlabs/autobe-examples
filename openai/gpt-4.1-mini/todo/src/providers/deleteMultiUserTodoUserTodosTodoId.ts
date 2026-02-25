import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

/**
 * Permanently deletes a todo item by its unique identifier.
 * Only the owning authenticated user is authorized to delete.
 * Deletes the todo and all associated edit history entries in a transaction.
 * @param props - Object containing authenticated user payload and the todoId.
 * @throws HttpException 403 if the user does not own the todo.
 * @throws Prisma.NotFoundError 404 if the todo does not exist.
 */
export async function deleteMultiUserTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoId } = props;
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: todoId },
    select: { id: true, multi_user_todo_user_id: true },
  });
  if (todo.multi_user_todo_user_id !== user.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.multi_user_todo_todo_edit_histories.deleteMany({
      where: { multi_user_todo_todo_id: todoId },
    });
    await tx.multi_user_todo_todos.delete({ where: { id: todoId } });
  });
}
