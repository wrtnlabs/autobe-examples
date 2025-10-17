import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { IETodoListTodoStatusFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoListTodoStatusFilter";
import { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { TodomemberPayload } from "../decorators/payload/TodomemberPayload";

export async function patchTodoListTodoMemberTodos(props: {
  todoMember: TodomemberPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const { todoMember, body } = props;

  // Authorization: ensure the member exists and is active (deleted_at IS NULL)
  const activeMember = await MyGlobal.prisma.todo_list_todo_members.findFirst({
    where: {
      id: todoMember.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (activeMember === null) {
    throw new HttpException("Unauthorized", 401);
  }

  // Defaults per business policy
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const status = body.status ?? "all";

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: {
        todo_list_todo_member_id: todoMember.id,
        ...(status === "active" && { is_completed: false }),
        ...(status === "completed" && { is_completed: true }),
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        is_completed: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: {
        todo_list_todo_member_id: todoMember.id,
        ...(status === "active" && { is_completed: false }),
        ...(status === "completed" && { is_completed: true }),
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    isCompleted: r.is_completed,
    createdAt: toISOStringSafe(r.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
