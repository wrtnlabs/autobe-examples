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

export async function patchTodoListUserTodoItems(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build complex where condition dynamically based on input
  const whereCondition: Record<string, unknown> = {
    todo_list_users_id: props.user.id,
    deleted_at: null,
  };

  // Apply completion filter if specified
  if (props.body.completed !== undefined && props.body.completed !== null) {
    whereCondition.completed = props.body.completed;
  }

  // Build order object based on sortBy and order
  const orderBy: Record<string, unknown> = {};
  if (props.body.sortBy === "created_at") {
    orderBy.created_at = props.body.order === "desc" ? "desc" : "asc";
  } else if (props.body.sortBy === "updated_at") {
    orderBy.updated_at = props.body.order === "desc" ? "desc" : "asc";
  } else {
    orderBy.created_at = "desc"; // default sort
  }

  // Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_todos.count({ where: whereCondition }),
  ]);

  // Transform results to match response DTO
  const transformedData: ITodoListTodo.ISummary[] = data.map((item) => ({
    id: item.id,
    title: item.title,
    completed: item.completed,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
