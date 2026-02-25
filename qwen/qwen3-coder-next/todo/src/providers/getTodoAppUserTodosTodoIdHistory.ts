import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistoryTransformer } from "../transformers/TodoAppTodoHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdHistory(props: {
  user: UserPayload;
  todoId: string;
}): Promise<ITodoAppTodoHistory[]> {
  // Verify todo ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      user: {
        id: props.user.id,
      },
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // Query edit history for this todo, sorted by most recent first
  const historyRecords = await MyGlobal.prisma.todo_app_todo_histories.findMany(
    {
      where: {
        todo_id: props.todoId,
      },
      orderBy: {
        edited_at: "desc",
      },
      ...TodoAppTodoHistoryTransformer.select(),
    },
  );
  // Transform to API response format
  return await ArrayUtil.asyncMap(
    historyRecords,
    TodoAppTodoHistoryTransformer.transform,
  );
}
