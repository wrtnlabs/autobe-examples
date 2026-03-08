import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistory.IRequest;
}): Promise<IPageITodoAppTodoHistory.ISummary> {
  // Verify todo exists and belongs to member (history preserved even for trashed todos)
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: { id: true, todo_app_member_id: true },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination params with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query histories with pagination
  const histories = await MyGlobal.prisma.todo_app_todo_histories.findMany({
    where: { todo_id: props.todoId },
    skip,
    take: limit,
    orderBy: { edited_at: "desc" },
    ...TodoAppTodoHistoryAtSummaryTransformer.select(),
  });
  // Total count for pagination
  const total = await MyGlobal.prisma.todo_app_todo_histories.count({
    where: { todo_id: props.todoId },
  });
  return {
    data: await ArrayUtil.asyncMap(
      histories,
      TodoAppTodoHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
