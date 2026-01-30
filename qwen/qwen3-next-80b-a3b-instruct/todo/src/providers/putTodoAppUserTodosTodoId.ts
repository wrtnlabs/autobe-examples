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
import { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoItemTransformer } from "../transformers/TodoAppTodoItemTransformer";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoItem.IUpdate;
}): Promise<ITodoAppTodoItem> {
  // Verify todo item exists and belongs to authenticated user
  const todoItem = await MyGlobal.prisma.todo_app_todo_items.findUniqueOrThrow({
    where: {
      id: props.todoId,
      deleted_at: null,
    },
  });
  // Verify user authorization
  if (todoItem.user_id !== props.user.id) {
    throw new HttpException("Todo item not found", 404);
  }
  // Update the item with new updated_at timestamp
  const updated = await MyGlobal.prisma.todo_app_todo_items.update({
    where: { id: props.todoId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
    ...TodoAppTodoItemTransformer.select(),
  });
  // Transform to response DTO
  return await TodoAppTodoItemTransformer.transform(updated);
}
