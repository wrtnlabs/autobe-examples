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

export async function deleteTodoAppUserTodosTodoIdPermanent(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify todo exists, belongs to the user, and is in trash
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: { not: null }, // Must be in trash
    },
  });
  if (!todo) {
    throw new HttpException(
      "Todo not found, does not belong to you, or is not in trash",
      404,
    );
  }
  const now = toISOStringSafe(new Date());
  // Perform cascade deletion in transaction to ensure data integrity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all related data before deleting the main todo
    await tx.todo_app_todo_histories.deleteMany({
      where: { todo_app_todo_id: props.todoId },
    });
    await tx.todo_app_todo_completions.deleteMany({
      where: { todo_app_todo_id: props.todoId },
    });
    await tx.todo_app_todo_description_fields.deleteMany({
      where: { todo_app_todo_id: props.todoId },
    });
    await tx.todo_app_todo_start_date_fields.deleteMany({
      where: { todo_app_todo_id: props.todoId },
    });
    await tx.todo_app_todo_due_date_fields.deleteMany({
      where: { todo_app_todo_id: props.todoId },
    });
    // Log the permanent deletion event for audit trail
    await tx.todo_app_permanent_deletions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_user_id: props.user.id,
        todo_app_todo_id: props.todoId,
        deleted_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    // Finally delete the main todo record
    await tx.todo_app_todos.delete({
      where: { id: props.todoId },
    });
  });
}
