import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const {
    page = 1,
    limit = 20,
    status,
    q,
    due_date_from,
    due_date_to,
    created_from,
    created_to,
    sort_by = "created_at",
    order = "desc",
  } = props.body;
  const skip = (page - 1) * limit;
  const where: any = {
    // Use 'any' so we can strip typia tags
    user_id: props.user.id as string, // Strip typia tags
    ...(status && { status: status as "pending" | "completed" | "archived" }),
    ...(q && {
      OR: [
        {
          title: {
            contains: q as string,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          description: {
            contains: q as string,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
    ...(due_date_from &&
      due_date_to && {
        due_date: {
          gte: due_date_from as string,
          lte: due_date_to as string,
        },
      }),
    ...(!due_date_from &&
      due_date_to && {
        due_date: {
          lte: due_date_to as string,
        },
      }),
    ...(due_date_from &&
      !due_date_to && {
        due_date: {
          gte: due_date_from as string,
        },
      }),
    ...(created_from &&
      created_to && {
        created_at: {
          gte: created_from as string,
          lte: created_to as string,
        },
      }),
    ...(!created_from &&
      created_to && {
        created_at: {
          lte: created_to as string,
        },
      }),
    ...(created_from &&
      !created_to && {
        created_at: {
          gte: created_from as string,
        },
      }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_by]: order },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      status: row.status as "pending" | "completed" | "archived",
      due_date:
        row.due_date == null ? row.due_date : toISOStringSafe(row.due_date),
      completed_at:
        row.completed_at == null
          ? row.completed_at
          : toISOStringSafe(row.completed_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
