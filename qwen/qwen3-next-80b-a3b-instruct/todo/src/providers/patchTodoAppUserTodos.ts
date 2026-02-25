import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const perPage = props.body.perPage ?? 10;
  const skip = (page - 1) * perPage;
  // Build where clause based on status
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  } satisfies Prisma.todo_app_todosWhereInput;
  if (props.body.status === "completed") {
    where.is_completed = true;
  } else if (props.body.status === "incomplete") {
    where.is_completed = false;
  }
  // Build order by clause
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = (
    props.body.sortBy === "createdAt"
      ? {
          created_at:
            props.body.sortDirection === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : props.body.sortBy === "startDate"
        ? {
            start_date:
              props.body.sortDirection === "asc"
                ? ("asc" as const)
                : ("desc" as const),
          }
        : props.body.sortBy === "dueDate"
          ? {
              due_date:
                props.body.sortDirection === "asc"
                  ? ("asc" as const)
                  : ("desc" as const),
            }
          : { created_at: "desc" as const }
  ) satisfies Prisma.todo_app_todosOrderByWithRelationInput;
  // Fetch data
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: perPage,
    orderBy,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  // Transform data using the reusable transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoAtSummaryTransformer.transform,
  );
  // Return paginated result
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: perPage,
      records: total,
      pages: Math.ceil(total / perPage),
    } satisfies IPage.IPagination,
  };
}
