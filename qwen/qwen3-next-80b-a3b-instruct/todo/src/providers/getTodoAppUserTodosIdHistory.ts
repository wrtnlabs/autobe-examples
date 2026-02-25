import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function getTodoAppUserTodosIdHistory(props: {
  user: UserPayload;
  id: string;
}): Promise<ITodoAppTodoHistory[]> {
  // Verify todo exists and belongs to user via relation
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.id },
    select: { id: true, user: { select: { id: true } } },
  });
  if (todo.user.id !== props.user.id) {
    throw new HttpException("Not Found", 404);
  }
  // Query edit history with transformer-select fields and sort
  const historyRecords = await MyGlobal.prisma.todo_app_todo_histories.findMany(
    {
      where: { todo_app_todo_id: props.id },
      orderBy: { edited_at: "desc" },
      ...TodoAppTodoHistoryTransformer.select(),
    },
  );
  // Transform records using transformer and return
  return await ArrayUtil.asyncMap(
    historyRecords,
    TodoAppTodoHistoryTransformer.transform,
  );
}
