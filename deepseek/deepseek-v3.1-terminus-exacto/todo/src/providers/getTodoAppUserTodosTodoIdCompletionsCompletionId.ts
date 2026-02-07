import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoCompletion";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoCompletionTransformer } from "../transformers/TodoAppTodoCompletionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdCompletionsCompletionId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  completionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoCompletion> {
  // Verify the todo exists and belongs to the authenticated user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException(
      "Todo not found or you don't have permission to access it",
      404,
    );
  }
  // Retrieve the specific completion record with transformer
  const completion = await MyGlobal.prisma.todo_app_todo_completions.findFirst({
    where: {
      id: props.completionId,
      todo_app_todo_id: props.todoId,
      deleted_at: null,
    },
    ...TodoAppTodoCompletionTransformer.select(),
  });
  if (!completion) {
    throw new HttpException("Completion record not found for this todo", 404);
  }
  return await TodoAppTodoCompletionTransformer.transform(completion);
}
