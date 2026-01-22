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

export async function deleteTodoAppUserTodoItemsTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify todo item exists and belongs to user
  const todoItem = await MyGlobal.prisma.todo_app_todo_items.findUnique({
    where: { id: props.todoItemId },
  });
  if (!todoItem) {
    throw new HttpException("Todo item not found", 404);
  }
  if (todoItem.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden: You do not own this todo item", 403);
  }
  // Proceed to delete
  await MyGlobal.prisma.todo_app_todo_items.delete({
    where: { id: props.todoItemId },
  });
}
