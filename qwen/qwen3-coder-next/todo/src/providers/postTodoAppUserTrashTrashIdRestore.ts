import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function postTodoAppUserTrashTrashIdRestore(props: {
  user: UserPayload;
  trashId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // 1. Retrieve the trash record by ID
  const trashRecord = await MyGlobal.prisma.todo_app_todo_trashes.findUnique({
    where: { id: props.trashId },
    include: {
      todo: true,
    },
  });
  // 2. Verify the trash record exists and belongs to the requesting user
  if (!trashRecord || trashRecord.user_id !== props.user.id) {
    throw new HttpException("Trash record not found or unauthorized", 404);
  }
  // 3. Restore the todo item by setting deleted_at to null
  const restoredTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: trashRecord.todo_id },
    data: {
      deleted_at: null,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
  // 4. Permanently delete the trash record
  await MyGlobal.prisma.todo_app_todo_trashes.delete({
    where: { id: props.trashId },
  });
  // 5. Return the restored todo item
  return {
    id: restoredTodo.id as string & tags.Format<"uuid">,
    todo_app_user_id: restoredTodo.todo_app_user_id as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(restoredTodo.created_at),
    updated_at: toISOStringSafe(restoredTodo.updated_at),
    deleted_at:
      restoredTodo.deleted_at === null
        ? undefined
        : toISOStringSafe(restoredTodo.deleted_at),
    title: restoredTodo.title,
    description: restoredTodo.description ?? undefined,
    start_date:
      restoredTodo.start_date === null
        ? undefined
        : toISOStringSafe(restoredTodo.start_date),
    due_date:
      restoredTodo.due_date === null
        ? undefined
        : toISOStringSafe(restoredTodo.due_date),
    is_completed: restoredTodo.is_completed,
  };
}
