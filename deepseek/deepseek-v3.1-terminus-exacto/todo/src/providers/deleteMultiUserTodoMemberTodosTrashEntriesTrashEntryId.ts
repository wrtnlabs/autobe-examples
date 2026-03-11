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

export async function deleteMultiUserTodoMemberTodosTrashEntriesTrashEntryId(props: {
  member: MemberPayload;
  trashEntryId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find trash entry with todo and verify it exists
  const trashEntry =
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.findUniqueOrThrow({
      where: { id: props.trashEntryId },
      select: {
        id: true,
        deleted_at: true,
        restored_at: true,
        permanently_deleted_at: true,
        todo: {
          select: {
            id: true,
            multi_user_todo_member_id: true,
          },
        } satisfies Prisma.multi_user_todo_todosFindManyArgs,
      },
    });
  // 2. Verify member owns the todo
  if (trashEntry.todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check trash entry is in deletable state (not already restored or permanently deleted)
  if (trashEntry.restored_at !== null) {
    throw new HttpException("Todo already restored from trash", 400);
  }
  if (trashEntry.permanently_deleted_at !== null) {
    throw new HttpException("Todo already permanently deleted", 400);
  }
  // 4. Delete associated edit history entries (cascade will handle, but explicit for clarity)
  await MyGlobal.prisma.multi_user_todo_edit_histories.deleteMany({
    where: { multi_user_todo_todo_id: trashEntry.todo.id },
  });
  // 5. Delete associated edit history snapshots
  await MyGlobal.prisma.multi_user_todo_edit_history_snapshots.deleteMany({
    where: { multi_user_todo_todo_id: trashEntry.todo.id },
  });
  // 6. Delete the todo (cascade should delete trash entry)
  await MyGlobal.prisma.multi_user_todo_todos.delete({
    where: { id: trashEntry.todo.id },
  });
  // 7. Return void (success)
}
