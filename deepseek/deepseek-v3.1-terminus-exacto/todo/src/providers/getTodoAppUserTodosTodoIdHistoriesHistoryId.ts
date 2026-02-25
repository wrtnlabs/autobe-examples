import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { TodoAppTodoHistoryTransformer } from "../transformers/TodoAppTodoHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdHistoriesHistoryId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistory> {
  // First verify the todo belongs to the authenticated user
  await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id, // Ensure todo belongs to user
      deleted_at: null, // Only active todos
    },
  });
  // Retrieve the specific history entry ensuring it belongs to the user's todo
  const history =
    await MyGlobal.prisma.todo_app_todo_histories.findFirstOrThrow({
      where: {
        id: props.historyId,
        todo_app_todo_id: props.todoId, // Ensure history belongs to the specified todo
        deleted_at: null, // Only active history entries
      },
      ...TodoAppTodoHistoryTransformer.select(),
    });
  return TodoAppTodoHistoryTransformer.transform(history);
}
