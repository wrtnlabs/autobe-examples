import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function patchTodoAppUserTodosTodoIdHistory(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistory.IRequest;
}): Promise<IPageITodoAppTodoHistory.ISummary> {
  // Verify user owns the todo
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  const page = props.body.page;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderBy = getOrderBy(props.body.sort);
  // Sequential execution for database consistency
  const data = await MyGlobal.prisma.todo_app_todo_histories.findMany({
    where: {
      todo_app_todo_id: props.todoId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy,
    ...TodoAppTodoHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todo_histories.count({
    where: {
      todo_app_todo_id: props.todoId,
      deleted_at: null,
    },
  });
  // Handle pagination edge cases
  const pageCount = Math.ceil(total / limit);
  const validCurrentPage = page > pageCount ? pageCount : page;
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: validCurrentPage,
      limit: limit,
      records: total,
      pages: pageCount,
    } satisfies IPage.IPagination,
  };
}
function getOrderBy(
  sort?: string,
): Prisma.todo_app_todo_historiesOrderByWithRelationInput {
  switch (sort) {
    case "created_at":
      return { created_at: "asc" };
    case "created_at:desc":
      return { created_at: "desc" };
    case "updated_at":
      return { updated_at: "asc" };
    case "updated_at:desc":
      return { updated_at: "desc" };
    default:
      return { created_at: "desc" };
  }
}
