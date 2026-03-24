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

export async function getTodoAppMemberTodosTodoIdHistoryHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyEntryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistoryEntry> {
  const todo = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const history =
    await MyGlobal.prisma.todo_app_todo_history_entries.findUniqueOrThrow({
      where: { id: props.historyEntryId, todo_app_todo_id: props.todoId },
      ...TodoAppTodoHistoryEntryTransformer.select(),
    });
  return await TodoAppTodoHistoryEntryTransformer.transform(history);
}
