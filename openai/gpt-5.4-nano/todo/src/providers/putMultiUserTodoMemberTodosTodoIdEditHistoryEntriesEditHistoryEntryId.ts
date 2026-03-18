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

export async function putMultiUserTodoMemberTodosTodoIdEditHistoryEntriesEditHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryEntryId: string & tags.Format<"uuid">;
  body: IMultiUserTodoEditHistoryEntry.IUpdate;
}): Promise<IMultiUserTodoEditHistoryEntry> {
  // Ensure edit history entry exists for this todo (and implicitly enforces todoId association)
  await MyGlobal.prisma.multi_user_todo_edit_history_entries.findUniqueOrThrow({
    where: {
      id: props.editHistoryEntryId,
      multi_user_todo_id: props.todoId,
    },
  });
  // Convert body fields that may include Date to the required DTO/string fields.
  // We only touch Date -> string via toISOStringSafe when such fields exist.
  const nextBody: IMultiUserTodoEditHistoryEntry.IUpdate &
    Record<string, unknown> = { ...props.body };
  for (const k of [
    "created_at",
    "updated_at",
    "started_at",
    "ended_at",
    "start_date",
    "end_date",
    "deleted_at",
    "expired_at",
    "expires_at",
  ] as const) {
    const v = (nextBody as Record<string, unknown>)[k];
    if (v instanceof Date) {
      (nextBody as Record<string, unknown>)[k] = toISOStringSafe(v);
    }
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.multi_user_todo_edit_history_entries.update({
      where: {
        id: props.editHistoryEntryId,
        multi_user_todo_id: props.todoId,
      },
      data: nextBody as any,
    });
    return updated as unknown as IMultiUserTodoEditHistoryEntry;
  });
  return result;
}
