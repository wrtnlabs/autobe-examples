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

export async function patchTodoListUserTodoListTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  if (props.body.page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }

  if (props.body.limit < 1 || props.body.limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }

  const skip = (props.body.page - 1) * props.body.limit;

  const where = {
    user_id: props.user.id,
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
    ...(props.body.priority !== undefined && props.body.priority !== null
      ? { priority: props.body.priority }
      : {}),
    ...((props.body.created_from !== undefined &&
      props.body.created_from !== null) ||
    (props.body.created_to !== undefined && props.body.created_to !== null)
      ? {
          created_at: {
            ...(props.body.created_from !== undefined &&
            props.body.created_from !== null
              ? { gte: props.body.created_from }
              : {}),
            ...(props.body.created_to !== undefined &&
            props.body.created_to !== null
              ? { lte: props.body.created_to }
              : {}),
          },
        }
      : {}),
    ...((props.body.due_from !== undefined && props.body.due_from !== null) ||
    (props.body.due_to !== undefined && props.body.due_to !== null)
      ? {
          due_date: {
            ...(props.body.due_from !== undefined &&
            props.body.due_from !== null
              ? { gte: props.body.due_from }
              : {}),
            ...(props.body.due_to !== undefined && props.body.due_to !== null
              ? { lte: props.body.due_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
      ? {
          OR: [
            { title: { contains: props.body.search } },
            { description: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take: props.body.limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        due_date: true,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  return {
    pagination: {
      current: props.body.page,
      limit: props.body.limit,
      records: total,
      pages: Math.ceil(total / props.body.limit),
    },
    data: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      status: typia.assert<"pending" | "completed" | "deleted">(todo.status),
      due_date: todo.due_date !== null ? toISOStringSafe(todo.due_date) : null,
    })),
  };
}
