import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
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

export async function putTodoAppMemberTodosTodoIdHistoryHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyEntryId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistoryEntry.IUpdate;
}): Promise<void> {
  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      const todo = await tx.todo_app_todos.findUnique({
        where: { id: props.todoId },
        select: { id: true, todo_app_member_id: true },
      });
      if (todo === null || todo.todo_app_member_id !== props.member.id) {
        throw new HttpException("Forbidden", 403);
      }
      const historyEntry = await tx.todo_app_todo_history_entries.findFirst({
        where: {
          id: props.historyEntryId,
          todo_app_todo_id: props.todoId,
        },
        select: { id: true },
      });
      if (historyEntry === null) {
        throw new HttpException("Forbidden", 403);
      }
      const deletedAt = props.body.deleted_at;
      const deletedAtValue: (Date | null) | undefined =
        deletedAt === undefined
          ? undefined
          : deletedAt === null
            ? null
            : new globalThis.Date(deletedAt);
      const updated = await tx.todo_app_todo_history_entries.updateMany({
        where: {
          id: props.historyEntryId,
          todo_app_todo_id: props.todoId,
        },
        data: {
          ...(deletedAtValue !== undefined && { deleted_at: deletedAtValue }),
          updated_at: new globalThis.Date(),
        },
      });
      if (updated.count !== 1) {
        throw new HttpException("Forbidden", 403);
      }
    });
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Request rejected", 400);
  }
}
