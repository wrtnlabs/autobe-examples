import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoTodoAtSummaryTransformer } from "../transformers/TodoTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoUserTrash(props: {
  user: UserPayload;
}): Promise<IPageITodoTodo.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.todo_todos.findMany({
    where: {
      todo_user_id: props.user.id,
      deleted_at: { not: null },
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_todos.count({
    where: {
      todo_user_id: props.user.id,
      deleted_at: { not: null },
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
