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
    search,
    completed,
    dueDateFrom,
    dueDateTo,
    createdFrom,
    createdTo,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = props.body;

  const take = pageSize;
  const skip = (page - 1) * pageSize;

  // Build search condition
  const conditions: Record<string, any> = {
    todo_list_user_id: props.user.id,
  };

  if (typeof completed === "boolean") {
    conditions.completed = completed;
  }

  if (dueDateFrom || dueDateTo) {
    conditions.due_date = {};
    if (dueDateFrom) conditions.due_date.gte = dueDateFrom;
    if (dueDateTo) conditions.due_date.lte = dueDateTo;
  }

  if (createdFrom || createdTo) {
    conditions.created_at = {};
    if (createdFrom) conditions.created_at.gte = createdFrom;
    if (createdTo) conditions.created_at.lte = createdTo;
  }

  if (search) {
    conditions.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Determine sort
  let orderBy: any = { created_at: "desc" };
  if (sortBy) {
    orderBy = { [sortBy]: sortOrder ?? "desc" };
  } else if (sortOrder) {
    orderBy = { created_at: sortOrder };
  }

  // Query and count in parallel for pagination
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: conditions,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_todos.count({ where: conditions }),
  ]);

  const data = todos.map((t) => ({
    id: t.id,
    todo_list_user_id: t.todo_list_user_id,
    title: t.title,
    completed: t.completed,
    due_date: t.due_date !== null ? toISOStringSafe(t.due_date) : null,
    created_at: toISOStringSafe(t.created_at),
    updated_at: toISOStringSafe(t.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
