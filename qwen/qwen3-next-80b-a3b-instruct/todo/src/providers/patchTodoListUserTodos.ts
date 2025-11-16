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
  const { perPage = 20, page = 1, query } = props.body;
  const skip = (page - 1) * perPage;
  const take = perPage;

  // Build where condition
  const whereCondition: Record<string, unknown> = {
    user_id: props.user.id,
    deleted_at: null,
  };

  if (query) {
    whereCondition.text = { contains: query, mode: "insensitive" };
  }

  // Fetch data and count in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: whereCondition,
      skip,
      take,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where: whereCondition }),
  ]);

  // Transform to API response format
  const summaryData = data.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    text: item.text.length > 50 ? item.text.substring(0, 50) : item.text,
    completed: item.completed,
    created_at: toISOStringSafe(item.created_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: take satisfies number as number,
      records: total,
      pages: Math.ceil(total / take) satisfies number as number,
    },
    data: summaryData,
  };
}
