import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoCompletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoCompletion";
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

export async function getTodoAppUserTodosTodoIdCompletion(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoCompletion> {
  // Verify todo ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Get most recent completion record
  const completionRecord =
    await MyGlobal.prisma.todo_app_todo_completions.findFirst({
      where: {
        todo_app_todo_id: props.todoId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      ...TodoAppTodoCompletionTransformer.select(),
    });
  // If completion record exists, transform and return
  if (completionRecord) {
    return await TodoAppTodoCompletionTransformer.transform(completionRecord);
  }
  // Default incomplete status if no completion records exist
  return {
    id: v4(),
    completed: false,
    created_at: new Date().toISOString(),
  };
}
