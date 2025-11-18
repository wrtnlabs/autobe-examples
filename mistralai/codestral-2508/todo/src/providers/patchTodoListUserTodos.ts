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
  // Pagination defaults per DTO spec
  const page = props.body.page ?? 1;
  const page_size = props.body.page_size ?? 20;
  const skip = (page - 1) * page_size;

  // Where clause: always restrict to this user only
  const where: any = {
    user_id: props.user.id,
  };

  // completed filter (true/false/null: undefined = any, true = only completed, false = only pending)
  if (props.body.completed === true) {
    where.completed = true;
  } else if (props.body.completed === false) {
    where.completed = false;
  }

  // Partial title substring match (case-insensitive)
  if (typeof props.body.title === "string" && props.body.title.length > 0) {
    where.title = { contains: props.body.title, mode: "insensitive" };
  }

  // Order
  let orderfield: "created_at" | "completed_at";
  if (props.body.order_by === "completed_at") {
    orderfield = "completed_at";
  } else {
    orderfield = "created_at";
  }
  const orderdir = props.body.order_dir === "asc" ? "asc" : "desc";

  // Parallel total counting and result fetching
  const [total, todos] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.count({ where }),
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      orderBy: { [orderfield]: orderdir },
      skip,
      take: page_size,
    }),
  ]);

  // Map DB record to DTO ISummary (NEVER use Date type natively, always use string w/ tags)
  const data = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    created_at: toISOStringSafe(todo.created_at),
    completed_at: todo.completed_at ? toISOStringSafe(todo.completed_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit: page_size,
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data,
  };
}
