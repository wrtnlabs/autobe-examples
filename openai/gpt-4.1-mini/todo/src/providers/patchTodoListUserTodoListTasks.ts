import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTasks";
import { IPageITodoListTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTasks";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodoListTasks(props: {
  user: UserPayload;
  body: ITodoListTasks.IRequest;
}): Promise<IPageITodoListTasks.ISummary> {
  const { user, body } = props;

  // Default to page 1 and limit 100 if not provided
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  if (page < 1) {
    throw new HttpException("Page must be 1 or greater", 400);
  }
  if (limit < 1) {
    throw new HttpException("Limit must be 1 or greater", 400);
  }

  const where = {
    todo_list_user_id: user.id,
    deleted_at: null,
    ...(body.isCompleted !== undefined &&
      body.isCompleted !== null && {
        is_completed: body.isCompleted,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        description: {
          contains: body.search,
        },
      }),
  };

  const allowedOrderBy = ["created_at", "updated_at", "description"];
  const orderByField =
    body.orderBy && allowedOrderBy.includes(body.orderBy)
      ? body.orderBy
      : "created_at";

  const orderDirection =
    body.orderDirection === "desc" || body.orderDirection === "asc"
      ? body.orderDirection
      : "asc";

  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.todo_list_tasks.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        description: true,
        is_completed: true,
        todo_list_user_id: true,
      },
    }),
    MyGlobal.prisma.todo_list_tasks.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: tasks.map((task) => ({
      id: task.id,
      description: task.description,
      is_completed: task.is_completed,
      todo_list_user_id: task.todo_list_user_id,
    })),
  };
}
