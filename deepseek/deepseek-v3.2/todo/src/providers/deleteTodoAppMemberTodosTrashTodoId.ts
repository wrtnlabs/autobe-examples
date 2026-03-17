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

export async function deleteTodoAppMemberTodosTrashTodoId(props: {
  member: MemberPayload;
  todoId: string;
}): Promise<void> {
  // Verify todo exists and belongs to member
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, todo_app_member_id: true },
  });
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check todo is in trash and not restored
  const trashEntry =
    await MyGlobal.prisma.todo_app_todo_trash_entries.findUnique({
      where: { todo_app_todo_id: props.todoId },
    });
  if (!trashEntry) {
    throw new HttpException("Todo not found in trash", 404);
  }
  if (trashEntry.restored_at !== null) {
    throw new HttpException("Todo has been restored from trash", 400);
  }
  if (trashEntry.permanently_deleted_at !== null) {
    throw new HttpException("Todo already permanently deleted", 400);
  }
  // Perform transactional deletion
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update trash entry with permanent deletion timestamp
    await prisma.todo_app_todo_trash_entries.update({
      where: { todo_app_todo_id: props.todoId },
      data: { permanently_deleted_at: new Date() },
    });
    // Delete trash item (cascade will handle other relations)
    await prisma.todo_app_todo_trash_items.delete({
      where: { todo_app_todo_id: props.todoId },
    });
    // Delete todo - cascade will handle histories, snapshots, attribute changes
    await prisma.todo_app_todos.delete({
      where: { id: props.todoId },
    });
  });
}
