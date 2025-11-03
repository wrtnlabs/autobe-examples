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
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoListTodoUserTodos(props: {
  todoUser: TodouserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const { todoUser, body } = props;
  const page = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const limit = Math.min(Math.max(limitRaw, 1), 50);

  // Fix: Initialize as {} not undefined, and only spread actual objects
  let created_at: { gte?: string; lte?: string } = {};
  if (body.created_from !== undefined && body.created_from !== null) {
    created_at = { ...created_at, gte: body.created_from };
  }
  if (body.created_to !== undefined && body.created_to !== null) {
    created_at = { ...created_at, lte: body.created_to };
  }
  let updated_at: { gte?: string; lte?: string } = {};
  if (body.updated_from !== undefined && body.updated_from !== null) {
    updated_at = { ...updated_at, gte: body.updated_from };
  }
  if (body.updated_to !== undefined && body.updated_to !== null) {
    updated_at = { ...updated_at, lte: body.updated_to };
  }

  const where = {
    todo_list_todouser_id: todoUser.id,
    ...(body.is_completed !== undefined && { is_completed: body.is_completed }),
    ...(body.search && { title: { contains: body.search } }),
    ...(Object.keys(created_at).length > 0 && { created_at }),
    ...(Object.keys(updated_at).length > 0 && { updated_at }),
  };

  const allowedSortBy = ["created_at", "updated_at", "title"] as const;
  const sortField = allowedSortBy.includes(body.sort_by as any)
    ? (body.sort_by as "created_at" | "updated_at" | "title")
    : "created_at";
  const sortOrder: "asc" | "desc" =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : sortField === "title"
        ? "asc"
        : "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        is_completed: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    is_completed: row.is_completed,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
