import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IETodoStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoStatusFilter";
import { IETodoTodoSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoTodoSortBy";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  const { user, body } = props;

  // Pagination defaults and cap
  const page: number = (body.page ?? 1) as number;
  const pageSizeRaw: number = (body.pageSize ?? 20) as number;
  const pageSize: number = pageSizeRaw > 100 ? 100 : pageSizeRaw;
  const skip: number = (page - 1) * pageSize;
  const take: number = pageSize;

  // Filters
  const status: IETodoStatusFilter = body.status ?? "all";
  const sortBy: IETodoTodoSortBy = body.sort_by ?? "created_at";
  const order: IESortOrder = body.order ?? "desc";

  const baseWhere = {
    todo_user_id: user.id,
    ...(status === "active" ? { completed: false } : {}),
    ...(status === "completed" ? { completed: true } : {}),
  };

  // Total count for pagination
  const total: number = await MyGlobal.prisma.todo_todos.count({
    where: baseWhere,
  });

  // Early return for empty result
  if (total === 0) {
    return typia.assert<IPageITodoTodo.ISummary>({
      pagination: {
        current: Number(page),
        limit: Number(pageSize),
        records: 0,
        pages: 0,
      },
      data: [],
    });
  }

  // Data fetching according to sort rules
  let rows: Array<{
    id: string;
    title: string;
    due_date: Date | null;
    completed: boolean;
    created_at: Date;
    updated_at: Date;
    user: {
      id: string;
      email: string;
      created_at: Date;
      updated_at: Date;
    };
  }> = [];

  if (sortBy === "created_at") {
    rows = await MyGlobal.prisma.todo_todos.findMany({
      where: baseWhere,
      orderBy: [{ created_at: order }, { updated_at: "desc" }],
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  } else if (sortBy === "due_date" && order === "asc") {
    // Place null due_date last by merging two queries
    const nonNullCount = await MyGlobal.prisma.todo_todos.count({
      where: { ...baseWhere, due_date: { not: null } },
    });

    if (skip < nonNullCount) {
      const part1Take = Math.min(take, nonNullCount - skip);
      const nonNullRows = await MyGlobal.prisma.todo_todos.findMany({
        where: { ...baseWhere, due_date: { not: null } },
        orderBy: { due_date: "asc" },
        skip,
        take: part1Take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      });

      const residual = take - part1Take;
      if (residual > 0) {
        const nullRows = await MyGlobal.prisma.todo_todos.findMany({
          where: { ...baseWhere, due_date: null },
          orderBy: { created_at: "desc" },
          skip: 0,
          take: residual,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        });
        rows = [...nonNullRows, ...nullRows];
      } else {
        rows = nonNullRows;
      }
    } else {
      const nullSkip = skip - nonNullCount;
      rows = await MyGlobal.prisma.todo_todos.findMany({
        where: { ...baseWhere, due_date: null },
        orderBy: { created_at: "desc" },
        skip: nullSkip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      });
    }
  } else {
    // sortBy === "due_date" && order === "desc" (no nulls-last policy required)
    rows = await MyGlobal.prisma.todo_todos.findMany({
      where: baseWhere,
      orderBy: { due_date: "desc" },
      skip,
      take,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  }

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    due_date: r.due_date ? toISOStringSafe(r.due_date) : null,
    completed: r.completed,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    owner: {
      id: r.user.id,
      email: r.user.email,
      created_at: toISOStringSafe(r.user.created_at),
      updated_at: toISOStringSafe(r.user.updated_at),
    },
  }));

  const pages: number = Math.ceil(total / pageSize);

  return typia.assert<IPageITodoTodo.ISummary>({
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  });
}
