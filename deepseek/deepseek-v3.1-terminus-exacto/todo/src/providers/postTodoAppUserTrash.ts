import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppTrashItemCollector } from "../collectors/TodoAppTrashItemCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashItemTransformer } from "../transformers/TodoAppTrashItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppUserTrash(props: {
  user: UserPayload;
  body: ITodoAppTrashItem.ICreate;
}): Promise<ITodoAppTrashItem> {
  // Verify the todo exists and belongs to the authenticated user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.body.todo_app_todo_id,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or already deleted", 404);
  }
  // Check if this todo is already in trash
  const existingTrashItem =
    await MyGlobal.prisma.todo_app_trash_items.findFirst({
      where: {
        todo_app_todo_id: props.body.todo_app_todo_id,
        restored_at: null,
        permanently_deleted_at: null,
      },
    });
  if (existingTrashItem) {
    throw new HttpException("Todo is already in trash", 400);
  }
  // Use transaction for data consistency
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create the trash item using the collector
    const trashItemData = await TodoAppTrashItemCollector.collect({
      body: props.body,
      todoAppUsers: { id: props.user.id },
      todoAppUserSessions: { id: props.user.session_id },
    });
    const createdTrashItem = await tx.todo_app_trash_items.create({
      data: trashItemData,
      ...TodoAppTrashItemTransformer.select(),
    });
    // Update the todo to mark it as deleted
    await tx.todo_app_todos.update({
      where: { id: props.body.todo_app_todo_id },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });
    return createdTrashItem;
  });
  return await TodoAppTrashItemTransformer.transform(result);
}
