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
import { TodoAppTodoHistoryChangeTransformer } from "../transformers/TodoAppTodoHistoryChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdHistoriesHistoryIdChangesChangeId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  changeId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistoryChange> {
  // Verify todo ownership and existence
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  // Verify history entry belongs to todo
  await MyGlobal.prisma.todo_app_todo_histories.findUniqueOrThrow({
    where: {
      id: props.historyId,
      todo_app_todo_id: props.todoId,
    },
  });
  // Retrieve the specific field change record with transformer
  const change =
    await MyGlobal.prisma.todo_app_todo_history_changes.findUniqueOrThrow({
      where: {
        id: props.changeId,
        todo_app_todo_history_id: props.historyId,
      },
      ...TodoAppTodoHistoryChangeTransformer.select(),
    });
  return await TodoAppTodoHistoryChangeTransformer.transform(change);
}
