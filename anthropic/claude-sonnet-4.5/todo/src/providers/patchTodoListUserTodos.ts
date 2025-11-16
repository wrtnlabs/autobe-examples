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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    todo_list_user_id: props.user.id,
    deleted_at: null,
  };

  if (props.body.search) {
    whereCondition.OR = [
      { title: { contains: props.body.search, mode: "insensitive" as const } },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    ];
  }

  if (props.body.status !== undefined && props.body.status !== null) {
    whereCondition.status = props.body.status;
  }

  if (props.body.completed !== undefined && props.body.completed !== null) {
    whereCondition.completed = props.body.completed;
  }

  if (props.body.priority !== undefined && props.body.priority !== null) {
    whereCondition.priority = props.body.priority;
  }

  if (props.body.due_after || props.body.due_before) {
    const dueDateCondition: Record<string, unknown> = {};
    if (props.body.due_after) {
      dueDateCondition.gte = props.body.due_after;
    }
    if (props.body.due_before) {
      dueDateCondition.lte = props.body.due_before;
    }
    whereCondition.due_date = dueDateCondition;
  }

  const orderByField = props.body.order_by ?? "created_at";
  const orderByDirection = props.body.order_direction ?? "desc";
  const orderBy = { [orderByField]: orderByDirection };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: whereCondition,
    }),
  ]);

  const summaries: ITodoListTodo.ISummary[] = data.map((todo) => ({
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    status: typia.assert<"completed" | "pending" | "in_progress" | "cancelled">(
      todo.status,
    ),
    priority:
      todo.priority !== null && todo.priority !== undefined
        ? typia.assert<"low" | "medium" | "high">(todo.priority)
        : undefined,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    completed: todo.completed,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  return {
    data: summaries,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
