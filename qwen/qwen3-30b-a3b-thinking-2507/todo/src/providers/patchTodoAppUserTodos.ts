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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    user_id: props.user.id,
    deleted_at: null,
    is_complete:
      props.body.status !== "all"
        ? props.body.status === "complete"
          ? true
          : false
        : undefined,
  } satisfies Prisma.todo_app_todosWhereInput;
  const todos = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: getOrderBy(props.body.sortBy, props.body.order),
    select: {
      id: true,
      title: true,
      is_complete: true,
      start_date: true,
      due_date: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  return {
    data: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      is_complete: todo.is_complete,
      start_date: toISOStringSafe(todo.start_date ?? new Date()),
      due_date: toISOStringSafe(todo.due_date ?? new Date()),
      created_at: toISOStringSafe(todo.created_at ?? new Date()),
    })) satisfies ITodoAppTodo.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppTodo.ISummary;
}
function getOrderBy(
  sortBy: ITodoAppTodo.IRequest["sortBy"] | undefined,
  order: ITodoAppTodo.IRequest["order"] | undefined,
) {
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {};
  switch (sortBy) {
    case "creationDate":
      orderBy.created_at = order === "desc" ? "desc" : "asc";
      break;
    case "startDate":
      orderBy.start_date = order === "desc" ? "desc" : "asc";
      break;
    case "dueDate":
      orderBy.due_date = order === "desc" ? "desc" : "asc";
      break;
    default:
      orderBy.created_at = "desc";
  }
  return orderBy;
}
