import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where filter for the user's todos
  const where = {
    user_id: props.user.id,
    ...(props.body.is_completed !== undefined && {
      is_completed: props.body.is_completed,
    }),
    ...(props.body.priority !== undefined &&
      props.body.priority !== null && {
        priority: props.body.priority,
      }),
    ...(props.body.due_date_from && {
      due_date: {
        ...(props.body.due_date_from && { gte: props.body.due_date_from }),
        ...(props.body.due_date_to && { lte: props.body.due_date_to }),
      },
    }),
    ...(props.body.due_date_to &&
      !props.body.due_date_from && {
        due_date: { lte: props.body.due_date_to },
      }),
  };

  // Full-text search for title or description
  let searchFilter: object = {};
  if (props.body.search) {
    searchFilter = {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }

  // Compose final where with search
  const finalWhere = {
    ...where,
    ...searchFilter,
  };

  // Sorting logic
  let orderBy: any = { created_at: "desc" };
  if (
    props.body.sort_by &&
    ["created_at", "due_date", "priority"].includes(props.body.sort_by)
  ) {
    orderBy = {
      [props.body.sort_by]: props.body.sort_order === "asc" ? "asc" : "desc",
    };
  }

  const [total, todos] = await Promise.all([
    MyGlobal.prisma.todo_todos.count({ where: finalWhere }),
    MyGlobal.prisma.todo_todos.findMany({
      where: finalWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        title: true,
        due_date: true,
        priority: true,
        is_completed: true,
      },
    }),
  ]);

  const data = todos.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    title: item.title,
    due_date: item.due_date ? toISOStringSafe(item.due_date) : undefined,
    priority:
      item.priority !== undefined && item.priority !== null
        ? typia.assert<"low" | "medium" | "high">(item.priority)
        : item.priority,
    is_completed: item.is_completed,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
