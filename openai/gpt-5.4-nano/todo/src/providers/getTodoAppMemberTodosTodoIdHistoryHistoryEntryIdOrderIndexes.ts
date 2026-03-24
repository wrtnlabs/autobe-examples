import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryEntryOrderIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntryOrderIndex";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistoryEntryOrderIndexTransformer } from "../transformers/TodoAppTodoHistoryEntryOrderIndexTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistoryHistoryEntryIdOrderIndexes(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyEntryId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistoryEntryOrderIndex> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: { todo_app_member_id: true },
  });
  if (todo === null || todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const indexRows =
    await MyGlobal.prisma.todo_app_todo_history_entry_order_indexes.findMany({
      where: {
        todo_app_todo_id: props.todoId,
        todo_app_todo_history_entry_id: props.historyEntryId,
        deleted_at: null,
      },
      ...TodoAppTodoHistoryEntryOrderIndexTransformer.select(),
      orderBy: { position: "asc" },
    });
  indexRows.sort((a, b) => a.position - b.position);
  const row = indexRows[0];
  if (row === undefined) {
    throw new HttpException("Not Found", 404);
  }
  return await TodoAppTodoHistoryEntryOrderIndexTransformer.transform(row);
}
