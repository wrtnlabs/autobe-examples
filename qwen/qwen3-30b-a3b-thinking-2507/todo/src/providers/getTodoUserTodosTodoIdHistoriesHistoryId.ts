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
import { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoHistoryTransformer } from "../transformers/TodoHistoryTransformer";

export async function getTodoUserTodosTodoIdHistoriesHistoryId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoHistory> {
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: {
      id: props.todoId,
      user: { id: props.user.id },
    },
  });
  if (!todo) {
    throw new HttpException("Todo item not found or access denied", 404);
  }
  const history = await MyGlobal.prisma.todo_histories.findUnique({
    where: {
      id: props.historyId,
      todo: { id: props.todoId },
    },
    include: {
      todo: true,
    },
  });
  if (!history) {
    throw new HttpException("History entry not found", 404);
  }
  return await TodoHistoryTransformer.transform(history);
}
