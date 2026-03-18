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

export async function deleteMultiUserTodoMemberTodosTodoIdEditHistoryEntriesEditHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryEntryId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const todo = await tx.multi_user_todo_members.findFirst({
      where: { id: props.member.id, deleted_at: null },
      select: { id: true },
    });
    if (!todo) {
      throw new HttpException("Not available", 404);
    }
    const editHistoryEntry =
      await tx.multi_user_todo_edit_history_entries.findFirst({
        where: {
          id: props.editHistoryEntryId,
          multi_user_todo_id: props.todoId,
          deleted_at: null,
          todo: {
            multi_user_todo_id: props.todoId,
            deleted_at: null,
          } as any,
        },
        select: { id: true },
      });
    if (!editHistoryEntry) {
      throw new HttpException("Not available", 404);
    }
    await tx.multi_user_todo_edit_history_entries.delete({
      where: { id: props.editHistoryEntryId },
    });
  });
}
