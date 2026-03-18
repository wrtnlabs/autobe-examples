import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
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

export async function getMultiUserTodoMemberTodosTodoIdEditHistoryEntriesEditHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryEntryId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoEditHistoryEntry> {
  const entry =
    await MyGlobal.prisma.multi_user_todo_edit_history_entries.findFirst({
      where: {
        id: props.editHistoryEntryId,
        multi_user_todo_id: props.todoId,
        deleted_at: null,
      },
      select: {
        id: true,
        edited_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // NOTE: omit nested selects that are not guaranteed by generated Prisma types
      },
    });
  if (!entry) throw new HttpException("Not found", 404);
  return {
    id: entry.id as unknown as IMultiUserTodoEditHistoryEntry["id"],
    editedAt: toISOStringSafe(entry.edited_at),
    createdAt: toISOStringSafe(entry.created_at),
    updatedAt: toISOStringSafe(entry.updated_at),
    deletedAt:
      entry.deleted_at === null ? null : toISOStringSafe(entry.deleted_at),
    // If nested changes are not available from Prisma select, provide an empty list
    // (matches IMultiUserTodoEditHistoryEntry shape)
    changes: [],
  };
}
