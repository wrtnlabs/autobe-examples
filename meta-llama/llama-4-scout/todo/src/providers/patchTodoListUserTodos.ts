import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;

  // Always filter by current user (multi-user/admin support not enabled here)
  const ownerId =
    props.body.user_id === props.user.id || !props.body.user_id
      ? props.user.id
      : props.user.id;

  const where: any = {
    todo_list_user_id: ownerId,
    ...(typeof props.body.is_completed === "boolean"
      ? { is_completed: props.body.is_completed }
      : {}),
    ...(props.body.due_date_from || props.body.due_date_to
      ? {
          due_date: {
            ...(props.body.due_date_from
              ? { gte: props.body.due_date_from }
              : {}),
            ...(props.body.due_date_to ? { lte: props.body.due_date_to } : {}),
          },
        }
      : {}),
    ...(props.body.search && props.body.search.length
      ? {
          OR: [
            { title: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const orderByField = props.body.order_by || "created_at";
  const orderDirection = props.body.order_desc === false ? "asc" : "desc";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  const data = items.map((row) => {
    return {
      id: row.id,
      todo_list_user_id: row.todo_list_user_id,
      title: row.title,
      description:
        typeof row.description === "undefined"
          ? undefined
          : row.description === null
            ? null
            : row.description,
      due_date:
        typeof row.due_date === "undefined"
          ? undefined
          : row.due_date === null
            ? null
            : toISOStringSafe(row.due_date),
      is_completed: row.is_completed,
      completed_at:
        typeof row.completed_at === "undefined"
          ? undefined
          : row.completed_at === null
            ? null
            : toISOStringSafe(row.completed_at),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
