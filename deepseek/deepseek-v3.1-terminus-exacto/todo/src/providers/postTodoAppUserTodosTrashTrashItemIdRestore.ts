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
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashItemTransformer } from "../transformers/TodoAppTrashItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppUserTodosTrashTrashItemIdRestore(props: {
  user: UserPayload;
  trashItemId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTrashItem> {
  // First validate that the trash item exists and belongs to the user
  const trashItem = await MyGlobal.prisma.todo_app_trash_items.findFirst({
    where: {
      id: props.trashItemId,
      todo_app_user_id: props.user.id,
      restored_at: null,
      permanently_deleted_at: null,
    },
    select: {
      id: true,
      todo_app_todo_id: true,
    },
  });
  if (!trashItem) {
    throw new HttpException("Trash item not found or already restored", 404);
  }
  // Verify the todo still exists
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: trashItem.todo_app_todo_id },
  });
  // Use transaction to ensure data consistency
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date().toISOString();
    // Update the todo to restore it (clear deleted_at)
    await tx.todo_app_todos.update({
      where: { id: trashItem.todo_app_todo_id },
      data: { deleted_at: null },
    });
    // Update the trash item to mark it as restored
    const updatedTrashItem = await tx.todo_app_trash_items.update({
      where: { id: props.trashItemId },
      data: {
        restored_at: now,
        updated_at: now,
      },
      ...TodoAppTrashItemTransformer.select(),
    });
    return updatedTrashItem;
  });
  return await TodoAppTrashItemTransformer.transform(result);
}
