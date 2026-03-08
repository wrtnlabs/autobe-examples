import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistoryEntry";
import { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppEditHistoryEntryTransformer } from "../transformers/TodoAppEditHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IPageITodoAppEditHistoryEntry.ISummary> {
  // Verify todo ownership
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId, todo_app_user_id: props.member.id },
  });
  // Query edit history entries
  const history = await MyGlobal.prisma.todo_app_edit_history_entries.findMany({
    where: {
      edit: { todo_id: props.todoId },
    },
    orderBy: { created_at: "desc" },
    skip: 0,
    take: 100,
    ...TodoAppEditHistoryEntryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_edit_history_entries.count({
    where: { edit: { todo_id: props.todoId } },
  });
  return {
    data: await ArrayUtil.asyncMap(
      history,
      TodoAppEditHistoryEntryTransformer.transform,
    ),
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppEditHistoryEntry.ISummary;
}
