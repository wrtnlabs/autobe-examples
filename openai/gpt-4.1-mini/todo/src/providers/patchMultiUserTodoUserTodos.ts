import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
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

export async function patchMultiUserTodoUserTodos(props: {
  user: UserPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 20;
  const skip = (page - 1) * limit;
  const validSortFields = ["created_at", "start_date", "due_date"];
  const validSortOrders = ["asc", "desc"];
  const sortField = validSortFields.includes(
    (props.body as any).sort_field ?? "created_at",
  )
    ? ((props.body as any).sort_field ?? "created_at")
    : "created_at";
  const sortOrder = validSortOrders.includes(
    (props.body as any).sort_order ?? "desc",
  )
    ? ((props.body as any).sort_order ?? "desc")
    : "desc";
  const whereInput: any = {
    deleted_at: null,
  };
  whereInput.user = { id: props.user.id };
  if ((props.body as any).completed === "completed") {
    whereInput.completed = true;
  } else if ((props.body as any).completed === "incomplete") {
    whereInput.completed = false;
  }
  let orderByInput: any[];
  if (sortField === "created_at") {
    orderByInput = [{ created_at: sortOrder }];
  } else {
    orderByInput = [
      { [sortField]: sortOrder },
      { [sortField]: sortOrder === "asc" ? "nullsLast" : "nullsFirst" },
      { id: "asc" },
    ];
  }
  const todos = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      title: true,
      completed: true,
      start_date: true,
      due_date: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.multi_user_todo_todos.count({
    where: whereInput,
  });
  return {
    data: todos.map((todo) => ({
      title: todo.title,
      completed: todo.completed,
      start_date: todo.start_date ? toISOStringSafe(todo.start_date) : null,
      due_date: todo.due_date ? toISOStringSafe(todo.due_date) : null,
      created_at: toISOStringSafe(todo.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
