import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getTodoAppUserTodosTodoIdHistoriesHistoryId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistory> {
  // First verify the todo belongs to the authenticated user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  // Query the history entry using the transformer's select method
  const history = await MyGlobal.prisma.todo_app_todo_histories.findUnique({
    where: {
      id: props.historyId,
      todo_app_todo_id: props.todoId,
      deleted_at: null,
    },
    ...TodoAppTodoHistoryTransformer.select(),
  });
  if (!history) {
    throw new HttpException("History entry not found", 404);
  }
  // Query field changes separately since they're not included in the transformer
  const fieldChanges =
    await MyGlobal.prisma.todo_app_todo_history_changes.findMany({
      where: {
        todo_app_todo_history_id: props.historyId,
      },
      orderBy: { created_at: "asc" },
    });
  // Transform the history using the transformer
  const transformedHistory =
    await TodoAppTodoHistoryTransformer.transform(history);
  // Add field changes to the transformed result
  return {
    ...transformedHistory,
    field_changes: fieldChanges.map((change) => ({
      id: change.id,
      field_name: change.field_name,
      previous_value: change.previous_value,
      new_value: change.new_value,
      created_at: toISOStringSafe(change.created_at),
    })),
  };
}
