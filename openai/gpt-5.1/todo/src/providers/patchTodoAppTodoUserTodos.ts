import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserTodos(props: {
  todoUser: TodouserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const requestBody = props.body;

  // Pagination: page is 1-based in request, current is 0-based in response
  const requestedPage = requestBody.page === undefined ? 1 : requestBody.page;
  const requestedLimit =
    requestBody.limit === undefined ? 20 : requestBody.limit;

  const effectivePage = requestedPage < 1 ? 1 : requestedPage;
  const effectiveLimit = requestedLimit < 1 ? 20 : requestedLimit;

  const zeroBasedPage = effectivePage - 1;
  const skip = zeroBasedPage * effectiveLimit;
  const take = effectiveLimit;

  // Base ownership and soft-delete constraints
  const includeDeletedFlag = requestBody.includeDeleted === true;

  const baseWhere: Prisma.todo_app_todosWhereInput = {
    todo_user_id: props.todoUser.id,
    ...(includeDeletedFlag
      ? {}
      : {
          deleted_at: null,
        }),
  };

  // Status filter: since the relation field is not present on todo_app_todosWhereInput,
  // we cannot express a join-based filter here without causing a Prisma type error.
  // Therefore, we only apply filters that are structurally valid on this model.
  const statusWhere: Prisma.todo_app_todosWhereInput = {};

  // Title keyword filter (simple contains, case-insensitive)
  const titleWhere: Prisma.todo_app_todosWhereInput =
    requestBody.titleKeyword === undefined || requestBody.titleKeyword === ""
      ? {}
      : {
          title: {
            contains: requestBody.titleKeyword,
            mode: Prisma.QueryMode.insensitive,
          },
        };

  // created_at range filter using raw ISO strings
  const createdFrom = requestBody.createdFrom;
  const createdTo = requestBody.createdTo;

  const createdAtWhere: Prisma.todo_app_todosWhereInput =
    createdFrom === undefined &&
    createdTo === undefined &&
    createdFrom === null &&
    createdTo === null
      ? {}
      : (() => {
          const range: Prisma.DateTimeFilter = {};

          if (createdFrom !== undefined && createdFrom !== null) {
            range.gte = createdFrom;
          }

          if (createdTo !== undefined && createdTo !== null) {
            range.lte = createdTo;
          }

          return Object.keys(range).length === 0
            ? {}
            : {
                created_at: range,
              };
        })();

  // due_date range filter using raw ISO strings
  const dueFrom = requestBody.dueFrom;
  const dueTo = requestBody.dueTo;

  const dueDateWhere: Prisma.todo_app_todosWhereInput =
    dueFrom === undefined &&
    dueTo === undefined &&
    dueFrom === null &&
    dueTo === null
      ? {}
      : (() => {
          const range: Prisma.DateTimeFilter = {};

          if (dueFrom !== undefined && dueFrom !== null) {
            range.gte = dueFrom;
          }

          if (dueTo !== undefined && dueTo !== null) {
            range.lte = dueTo;
          }

          return Object.keys(range).length === 0
            ? {}
            : {
                due_date: range,
              };
        })();

  const where: Prisma.todo_app_todosWhereInput = {
    ...baseWhere,
    ...statusWhere,
    ...titleWhere,
    ...createdAtWhere,
    ...dueDateWhere,
  };

  // Sorting
  const orderByField = requestBody.orderBy;
  const orderDirection: Prisma.SortOrder =
    requestBody.orderDirection === "asc" ? "asc" : "desc";

  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput =
    orderByField === "dueDate"
      ? { due_date: orderDirection }
      : orderByField === "status"
        ? { todo_status_id: orderDirection }
        : { created_at: orderDirection };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where,
    }),
  ]);

  const data: ITodoAppTodo.ISummary[] = rows.map((row) => {
    // We only have primitive fields on the row, so we derive status directly
    // from the stored status code/string on the row itself when available.

    const dueDateValue = row.due_date;
    const completedAtValue = row.completed_at;

    const summary: ITodoAppTodo.ISummary = {
      id: row.id,
      title: row.title,
      status: (row as any).status ?? "",
      statusInfo: undefined,
      due_date:
        dueDateValue === null
          ? undefined
          : toISOStringSafe(dueDateValue as unknown as string),
      created_at: toISOStringSafe(row.created_at as unknown as string),
      updated_at: toISOStringSafe(row.updated_at as unknown as string),
      completed_at:
        completedAtValue === null
          ? undefined
          : toISOStringSafe(completedAtValue as unknown as string),
    };

    return summary;
  });

  const pages = effectiveLimit === 0 ? 0 : Math.ceil(total / effectiveLimit);

  const pagination: IPage.IPagination = {
    current: zeroBasedPage,
    limit: effectiveLimit,
    records: total,
    pages,
  };

  return {
    pagination,
    data,
  };
}
