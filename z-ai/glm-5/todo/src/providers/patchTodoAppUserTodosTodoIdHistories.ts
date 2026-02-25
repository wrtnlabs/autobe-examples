import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTodoIdHistories(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistory.IRequest;
}): Promise<IPageITodoAppTodoHistory.ISummary> {
  // Authorization check - verify user owns the todo
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { user_id: true },
  });
  if (todo.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination setup
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Query history entries sorted by created_at DESC
  const data = await MyGlobal.prisma.todo_app_todo_histories.findMany({
    where: { todo_app_todo_id: props.todoId },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppTodoHistoryAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_app_todo_histories.count({
    where: { todo_app_todo_id: props.todoId },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
