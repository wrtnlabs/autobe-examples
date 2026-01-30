import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserIdTodoItemsTodoItemId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_app_todo_items.findUnique({
    where: { id: props.todoItemId },
    select: { id: true, todo_app_user_id: true },
  });
  if (!existing) {
    throw new HttpException("Todo item not found", 404);
  }
  if (existing.todo_app_user_id !== props.userId) {
    throw new HttpException("Forbidden: Not owner of todo item", 403);
  }
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden: User ID mismatch", 403);
  }
  await MyGlobal.prisma.todo_app_todo_items.delete({
    where: { id: props.todoItemId },
  });
}
