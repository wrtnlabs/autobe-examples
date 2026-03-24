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
import { TodoAppTodoHistoryEntryTransformer } from "../transformers/TodoAppTodoHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistoryEntriesHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyEntryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistoryEntry> {
  const historyEntry =
    await MyGlobal.prisma.todo_app_todo_history_entries.findFirstOrThrow({
      where: {
        id: props.historyEntryId,
        todo_app_todo_id: props.todoId,
        deleted_at: null,
        todo: {
          todo_app_member_id: props.member.id,
          deleted_at: null,
        },
      },
      ...TodoAppTodoHistoryEntryTransformer.select(),
    });
  return await TodoAppTodoHistoryEntryTransformer.transform(historyEntry);
}
