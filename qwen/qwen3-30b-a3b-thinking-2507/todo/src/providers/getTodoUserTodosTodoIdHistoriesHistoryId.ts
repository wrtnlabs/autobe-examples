import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
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
import { TodoHistoryTransformer } from "../transformers/TodoHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoUserTodosTodoIdHistoriesHistoryId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoHistory> {
  const history = await MyGlobal.prisma.todo_histories.findUnique({
    where: { id: props.historyId },
    ...TodoHistoryTransformer.select(),
  });
  if (!history) {
    throw new HttpException("History record not found", 404);
  }
  if (history.todo.id !== props.todoId) {
    throw new HttpException("History does not belong to specified todo", 404);
  }
  return await TodoHistoryTransformer.transform(history);
}
