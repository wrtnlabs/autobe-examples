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
import { TodolistmemberPayload } from "../decorators/payload/TodolistmemberPayload";

export async function patchTodoListTodoListMemberTodos(props: {
  todoListMember: TodolistmemberPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const {
    searchTerm,
    is_complete,
    created_from,
    created_to,
    sort_by,
    sort_order,
    page,
    page_size,
  } = props.body;

  // Enforce per-user data isolation
  const userId = props.todoListMember.id;

  // Validate and clamp page and page_size
  const _page = page < 1 ? 1 : page;
  const _page_size = page_size < 1 ? 1 : page_size > 100 ? 100 : page_size;
  const skip = (_page - 1) * _page_size;

  // Build filtering conditions
  const where: any = {
    todo_list_todolistmember_id: userId,
  };
  if (is_complete !== undefined && is_complete !== null) {
    where.is_complete = is_complete;
  }
  if (created_from) {
    where.created_at = { ...(where.created_at || {}), gte: created_from };
  }
  if (created_to) {
    where.created_at = { ...(where.created_at || {}), lte: created_to };
  }
  if (searchTerm) {
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  const orderBy: any = {};
  if (sort_by === "title") {
    orderBy.title = sort_order === "asc" ? "asc" : "desc";
  } else {
    orderBy.created_at = sort_order === "asc" ? "asc" : "desc";
  }

  // Query todos and count in parallel
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take: _page_size,
      orderBy,
      select: {
        id: true,
        title: true,
        is_complete: true,
        completed_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: _page,
      limit: _page_size,
      records: total,
      pages: Math.ceil(total / _page_size),
    },
    data: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      is_complete: todo.is_complete,
      completed_at: todo.completed_at
        ? toISOStringSafe(todo.completed_at)
        : undefined,
    })),
  };
}
