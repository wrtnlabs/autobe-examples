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

export async function patchTodoAppUserTrash(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy,
    order = props.body,
  } = props.body;
  const skip = (page - 1) * limit;
  const where: Prisma.todo_app_todosWhereInput = {
    deleted_at: { not: null },
    user_id: props.user.id,
  };
  if (status === "complete") {
    where.is_complete = true;
  } else if (status === "incomplete") {
    where.is_complete = false;
  }
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {
    created_at: "desc" as const,
  };
  if (sortBy && order) {
    const fieldMap: Record<string, keyof Prisma.todo_app_todosWhereInput> = {
      creationDate: "created_at",
      startDate: "start_date",
      dueDate: "due_date",
    };
    const field = fieldMap[sortBy];
    if (field) {
      orderBy[field as keyof typeof orderBy] =
        order === "asc" ? ("asc" as const) : ("desc" as const);
    }
  }
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      is_complete: true,
      start_date: true,
      due_date: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({ where });
  const finalData = await Promise.all(
    data.map(async (item) => {
      return {
        id: item.id,
        title: item.title,
        is_complete: item.is_complete,
        start_date: item.start_date
          ? (toISOStringSafe(item.start_date) as string &
              tags.Format<"date-time">)
          : null,
        due_date: item.due_date
          ? (toISOStringSafe(item.due_date) as string &
              tags.Format<"date-time">)
          : null,
        created_at: toISOStringSafe(item.created_at) as string &
          tags.Format<"date-time">,
      };
    }),
  );
  return {
    data: finalData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  } satisfies IPageITodoAppTodo.ISummary;
}
