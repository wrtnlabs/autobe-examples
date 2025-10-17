import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoItem";
import { IPageITodoListTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodoItems(props: {
  user: UserPayload;
  body: ITodoListTodoItem.IRequest;
}): Promise<IPageITodoListTodoItem.ISummary> {
  const { user } = props;

  // body is null as per the API specification, so we'll implement basic retrieval
  const page = 1; // Default page
  const limit = 20; // Default limit
  const skip = (page - 1) * limit;

  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todo_items.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todo_items.count({ where: { user_id: user.id } }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: todos.map((todo) => ({
      id: todo.id,
      content: todo.content,
      completed: todo.completed,
      created_at: toISOStringSafe(todo.created_at),
    })),
  };
}
