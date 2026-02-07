import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistoryChangeTransformer } from "../transformers/TodoAppTodoHistoryChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdHistoriesHistoryIdChangesChangeId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  changeId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistoryChange> {
  // First verify the todo exists and belongs to the user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      user: { id: props.user.id },
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Then verify the history exists and belongs to the todo
  const history = await MyGlobal.prisma.todo_app_todo_histories.findFirst({
    where: {
      id: props.historyId,
      todo: { id: props.todoId },
    },
  });
  if (!history) {
    throw new HttpException("History entry not found", 404);
  }
  // Finally retrieve the specific field change record
  const change = await MyGlobal.prisma.todo_app_todo_history_changes.findFirst({
    where: {
      id: props.changeId,
      todo_app_todo_history_id: props.historyId,
    },
    ...TodoAppTodoHistoryChangeTransformer.select(),
  });
  if (!change) {
    throw new HttpException("Field change record not found", 404);
  }
  return await TodoAppTodoHistoryChangeTransformer.transform(change);
}
