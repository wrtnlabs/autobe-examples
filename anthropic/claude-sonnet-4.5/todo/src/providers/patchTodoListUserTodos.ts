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
  const { user, body } = props;

  // Extract and validate pagination parameters
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 50) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;

  // Determine sort order
  const sort = body.sort ?? "created_newest";

  // Execute concurrent queries for data and count
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: {
        todo_list_user_id: user.id,
        deleted_at: null,
        ...(body.status !== undefined &&
          body.status !== null &&
          body.status !== "all" && {
            status: body.status,
          }),
        ...(body.search !== undefined &&
          body.search !== null && {
            title: {
              contains: body.search,
            },
          }),
      },
      orderBy:
        sort === "created_oldest"
          ? { created_at: "asc" }
          : sort === "updated_recent"
            ? { updated_at: "desc" }
            : { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: {
        todo_list_user_id: user.id,
        deleted_at: null,
        ...(body.status !== undefined &&
          body.status !== null &&
          body.status !== "all" && {
            status: body.status,
          }),
        ...(body.search !== undefined &&
          body.search !== null && {
            title: {
              contains: body.search,
            },
          }),
      },
    }),
  ]);

  // Calculate total pages
  const pages = Math.ceil(total / limit);

  // Transform to ISummary format
  const data: ITodoListTodo.ISummary[] = todos.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    todo_list_user_id: todo.todo_list_user_id as string & tags.Format<"uuid">,
    title: todo.title,
    status: todo.status as "complete" | "incomplete",
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  // Build pagination response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
