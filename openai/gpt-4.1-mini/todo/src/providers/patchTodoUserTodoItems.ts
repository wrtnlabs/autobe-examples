import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import { IPageITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodoItems(props: {
  user: UserPayload;
  body: ITodoItem.IRequest;
}): Promise<IPageITodoItem.ISummary> {
  const { user, body } = props;

  const page = Number(body.page);
  const pageSize = Number(body.page_size);

  const where = {
    todo_user_id: user.id,
    deleted_at: null,
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...((body.due_date_from !== undefined && body.due_date_from !== null) ||
    (body.due_date_to !== undefined && body.due_date_to !== null)
      ? {
          due_date: {
            ...(body.due_date_from !== undefined &&
              body.due_date_from !== null && {
                gte: toISOStringSafe(body.due_date_from),
              }),
            ...(body.due_date_to !== undefined &&
              body.due_date_to !== null && {
                lte: toISOStringSafe(body.due_date_to),
              }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.todo_todo_items.findMany({
      where,
      orderBy:
        body.sort_by === "due_date"
          ? { due_date: body.sort_order === "asc" ? "asc" : "desc" }
          : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        description: true,
        status: true,
        due_date: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.todo_todo_items.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: items.map((item) => ({
      id: item.id,
      description: item.description,
      status: typia.assert<"pending" | "completed">(item.status),
      due_date: item.due_date ? toISOStringSafe(item.due_date) : null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
