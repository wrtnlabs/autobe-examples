import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTodoIdHistories(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistory.IRequest;
}): Promise<IPageITodoAppTodoHistory.ISummary> {
  // Verify todo exists and belongs to user
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page;
  const limit = Math.min(props.body.limit, 100);
  const skip = (page - 1) * limit;
  // Build orderBy based on sort parameter
  const orderBy =
    props.body.sort === "created_at"
      ? { created_at: "asc" as const }
      : props.body.sort === "updated_at"
        ? { updated_at: "asc" as const }
        : props.body.sort === "updated_at:desc"
          ? { updated_at: "desc" as const }
          : ({
              created_at: "desc" as const,
            } satisfies Prisma.todo_app_todo_historiesOrderByWithRelationInput);
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_histories.findMany({
      where: {
        todo_app_todo_id: props.todoId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy,
      ...TodoAppTodoHistoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_todo_histories.count({
      where: {
        todo_app_todo_id: props.todoId,
        deleted_at: null,
      },
    }),
  ]);
  return {
    data: await Promise.all(
      data.map(TodoAppTodoHistoryAtSummaryTransformer.transform),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
