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
    keyword,
    status,
    created_from,
    created_to,
    page = 1,
    limit = 20,
    order = "created_at:desc",
  } = props.body || {};

  const take = Math.max(Math.min(limit, 100), 1);
  const skip = (Math.max(page, 1) - 1) * take;

  // Build where condition, handling all optional filters
  const where: Record<string, unknown> = {
    user_id: props.user.id,
    ...(status && { status }),
    ...(keyword && {
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ],
    }),
    ...(created_from && created_to
      ? { created_at: { gte: created_from, lte: created_to } }
      : created_from
        ? { created_at: { gte: created_from } }
        : created_to
          ? { created_at: { lte: created_to } }
          : {}),
  };

  const parts = order.split(":");
  const orderBy = {
    [parts[0]]: parts[1] === "asc" ? "asc" : "desc",
  } as { [key: string]: Prisma.SortOrder };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: typia.assert<"incomplete" | "complete">(row.status),
      completed_at: row.completed_at ? toISOStringSafe(row.completed_at) : null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
