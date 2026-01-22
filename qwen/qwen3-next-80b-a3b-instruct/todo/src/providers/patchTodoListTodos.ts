import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodoListTodoAtSummaryTransformer } from "../transformers/TodoListTodoAtSummaryTransformer";

export async function patchTodoListTodos(): Promise<IPageITodoListTodo.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.todo_list_todos.findMany({
    where: { deleted_at: null },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoListTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_list_todos.count({
    where: { deleted_at: null },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoListTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
