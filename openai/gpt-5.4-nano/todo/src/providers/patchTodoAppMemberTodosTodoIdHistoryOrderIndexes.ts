import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function patchTodoAppMemberTodosTodoIdHistoryOrderIndexes(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IRequest;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: { id: true, todo_app_member_id: true },
  });
  if (todo === null || todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // IRequest currently does not contain history-entry specific narrowing options.
  // Per specification, default to rebuilding ordering for all active history entries.
  const historyEntries =
    await MyGlobal.prisma.todo_app_todo_history_entries.findMany({
      where: { todo_app_todo_id: props.todoId, deleted_at: null },
      select: { id: true, created_at: true },
    });
  const ordered = historyEntries.slice().sort((a, b) => {
    const ac = Date.parse(String(a.created_at));
    const bc = Date.parse(String(b.created_at));
    if (bc !== ac) return bc - ac;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (let position = 0; position < ordered.length; position++) {
      const entry = ordered[position];
      await tx.todo_app_todo_history_entry_order_indexes.upsert({
        where: { todo_app_todo_history_entry_id: entry.id },
        create: {
          id: typia.assert<string & tags.Format<"uuid">>(v4()),
          todo_app_todo_id: props.todoId,
          todo_app_todo_history_entry_id: entry.id,
          position,
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
        },
        update: {
          todo_app_todo_id: props.todoId,
          position,
          updated_at: nowIso,
          deleted_at: null,
        },
      });
    }
    // Cleanup: mark any existing index rows for this todo whose history entry is no longer included.
    const includedIds = new Set(ordered.map((e) => e.id));
    const existingIndexes =
      await tx.todo_app_todo_history_entry_order_indexes.findMany({
        where: { todo_app_todo_id: props.todoId },
        select: { todo_app_todo_history_entry_id: true, deleted_at: true },
      });
    for (const idx of existingIndexes) {
      if (
        !includedIds.has(idx.todo_app_todo_history_entry_id) &&
        idx.deleted_at === null
      ) {
        await tx.todo_app_todo_history_entry_order_indexes.update({
          where: {
            todo_app_todo_history_entry_id: idx.todo_app_todo_history_entry_id,
          },
          data: {
            deleted_at: nowIso,
            updated_at: nowIso,
          },
        });
      }
    }
  });
}
