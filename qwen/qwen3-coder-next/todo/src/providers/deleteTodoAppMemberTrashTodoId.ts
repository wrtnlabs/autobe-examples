import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppMemberTrashTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_user_id: true,
      is_trashed: true,
      trashEntry: {
        select: { id: true, permanently_deleted_at: true },
      },
    },
  });
  if (todo.todo_app_user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (!todo.is_trashed) {
    throw new HttpException("Todo is not in trash", 400);
  }
  if (
    todo.trashEntry === null ||
    todo.trashEntry.permanently_deleted_at !== null
  ) {
    throw new HttpException("Todo already permanently deleted", 400);
  }
  const editHistory = await MyGlobal.prisma.todo_app_todo_edits.findMany({
    where: { todo_id: props.todoId },
    select: { id: true },
  });
  for (const edit of editHistory) {
    await MyGlobal.prisma.todo_app_edit_history_entries.deleteMany({
      where: { todo_app_todo_edit_id: edit.id },
    });
  }
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
  await MyGlobal.prisma.todo_app_todo_trashes.update({
    where: { todo_id: props.todoId },
    data: { permanently_deleted_at: toISOStringSafe(new Date()) },
  });
}
