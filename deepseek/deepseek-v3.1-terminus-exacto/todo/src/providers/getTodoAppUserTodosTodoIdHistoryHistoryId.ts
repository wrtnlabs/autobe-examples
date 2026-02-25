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

export async function getTodoAppUserTodosTodoIdHistoryHistoryId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistory> {
  // Verify todo exists and belongs to the current user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (todo === null) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Fetch the specific history entry for this todo
  const history =
    await MyGlobal.prisma.todo_app_todo_histories.findUniqueOrThrow({
      where: {
        id: props.historyId,
        todo_app_todo_id: props.todoId,
        deleted_at: null,
      },
      ...TodoAppTodoHistoryTransformer.select(),
    });
  // Transform and return the result
  return await TodoAppTodoHistoryTransformer.transform(history);
}
