import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoEditHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoEditHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdEditHistories(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoEditHistory.IRequest;
}): Promise<IPageITodoAppTodoEditHistory.ISummary> {
  // Step 1: Verify todo exists (throws 404 if not found)
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, todo_app_member_id: true },
  });
  // Step 2: Ownership check — member must own the todo
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortOrder = props.body.sortOrder ?? "asc";
  // Step 4: Query edit histories with pagination and sorting
  const data = await MyGlobal.prisma.todo_app_todo_edit_histories.findMany({
    where: { todo_app_todo_id: props.todoId },
    skip,
    take: limit,
    orderBy: { created_at: sortOrder },
    ...TodoAppTodoEditHistoryAtSummaryTransformer.select(),
  });
  // Step 5: Count total records
  const total = await MyGlobal.prisma.todo_app_todo_edit_histories.count({
    where: { todo_app_todo_id: props.todoId },
  });
  // Step 6: Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoEditHistoryAtSummaryTransformer.transform,
    ),
  };
}
