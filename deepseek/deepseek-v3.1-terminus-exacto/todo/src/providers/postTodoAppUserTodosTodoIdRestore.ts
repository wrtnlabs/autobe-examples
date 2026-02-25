import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppUserTodosTodoIdRestore(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Verify the todo exists in trash and belongs to the user
  const trashItem = await MyGlobal.prisma.todo_app_trash_items.findFirst({
    where: {
      todo_app_todo_id: props.todoId,
      restored_at: null,
      todo: {
        todo_app_user_id: props.user.id,
      },
    },
    include: {
      todo: true,
    },
  });
  if (!trashItem) {
    throw new HttpException("Todo not found in trash or already restored", 404);
  }
  const now = new Date();
  // Use transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update todo to clear deleted_at
    await tx.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        deleted_at: null,
        updated_at: now,
      },
    });
    // Update trash item to mark as restored
    await tx.todo_app_trash_items.update({
      where: { id: trashItem.id },
      data: {
        restored_at: now,
      },
    });
    // Create restoration record for audit trail
    await tx.todo_app_trash_restorations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_trash_item_id: trashItem.id,
        todo_app_user_id: props.user.id,
        created_at: now,
        updated_at: now,
      },
    });
    // Fetch the restored todo
    const restoredTodo = await tx.todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...TodoAppTodoTransformer.select(),
    });
    return restoredTodo;
  });
  return await TodoAppTodoTransformer.transform(result);
}
