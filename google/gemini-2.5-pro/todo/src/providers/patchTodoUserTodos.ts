import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const allowedOrderFields = [
    "created_at",
    "updated_at",
    "completed_at",
  ] as const;
  const orderByField =
    props.body.order_by && allowedOrderFields.includes(props.body.order_by)
      ? props.body.order_by
      : "created_at";
  const orderDirection = props.body.order_direction === "asc" ? "asc" : "desc";

  // Build Prisma where condition
  const where = {
    todo_user_id: props.user.id satisfies string as string,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.search
      ? {
          OR: [
            {
              title: {
                contains: props.body.search satisfies string as string,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
            {
              description: {
                contains: props.body.search satisfies string as string,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_todos.findMany({
      where,
      orderBy: {
        [orderByField]: orderDirection,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_todos.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      title: row.title,
      status: typia.assert<"incomplete" | "complete">(
        row.status satisfies string as string,
      ),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      completed_at:
        row.completed_at !== null && row.completed_at !== undefined
          ? toISOStringSafe(row.completed_at)
          : undefined,
      user: {
        id: row.todo_user_id satisfies string as string,
      },
    })),
  };
}
