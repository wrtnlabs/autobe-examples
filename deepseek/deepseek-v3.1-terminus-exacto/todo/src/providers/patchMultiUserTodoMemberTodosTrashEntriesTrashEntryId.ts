import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoTrashEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTrashEntryTransformer } from "../transformers/MultiUserTodoTodoTrashEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTrashEntriesTrashEntryId(props: {
  member: MemberPayload;
  trashEntryId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodoTrashEntry.IUpdate;
}): Promise<IMultiUserTodoTodoTrashEntry> {
  // 1. Validate ownership and trash entry state
  const trashEntry =
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.findUniqueOrThrow({
      where: { id: props.trashEntryId },
    });
  // Fetch the related todo to check ownership
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: trashEntry.multi_user_todo_todo_id },
    select: { multi_user_todo_member_id: true, deleted_at: true },
  });
  // Ownership check
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // State validation
  if (trashEntry.restored_at !== null) {
    throw new HttpException("Trash entry already restored", 400);
  }
  if (trashEntry.permanently_deleted_at !== null) {
    throw new HttpException("Trash entry already permanently deleted", 400);
  }
  const now = new Date();
  // 2. Process action based on transaction boundary
  if (props.body.action === "restore") {
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update trash entry with restored timestamp
      await tx.multi_user_todo_todo_trash_entries.update({
        where: { id: props.trashEntryId },
        data: { restored_at: now, updated_at: now },
      });
      // Restore todo: clear deleted_at timestamp
      await tx.multi_user_todo_todos.update({
        where: { id: trashEntry.multi_user_todo_todo_id },
        data: { deleted_at: null, updated_at: now },
      });
    });
  } else if (props.body.action === "permanently_delete") {
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Update trash entry with permanent deletion timestamp
      await tx.multi_user_todo_todo_trash_entries.update({
        where: { id: props.trashEntryId },
        data: { permanently_deleted_at: now, updated_at: now },
      });
      // Permanently delete todo (cascade will delete edit history)
      await tx.multi_user_todo_todos.delete({
        where: { id: trashEntry.multi_user_todo_todo_id },
      });
    });
  } else {
    throw new HttpException("Invalid action", 400);
  }
  // 3. Fetch and return updated trash entry
  const updatedTrashEntry =
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.findUniqueOrThrow({
      where: { id: props.trashEntryId },
      ...MultiUserTodoTodoTrashEntryTransformer.select(),
    });
  return await MultiUserTodoTodoTrashEntryTransformer.transform(
    updatedTrashEntry,
  );
}
