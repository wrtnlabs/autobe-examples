import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTodoIdCompletions(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.ICompletionUpdate;
}): Promise<ITodoAppTodo> {
  // Verify todo exists and belongs to user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  // Use transaction for data consistency
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create completion record
    const completion = await tx.todo_app_todo_completions.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        completed: props.body.completed,
        created_at: toISOStringSafe(new Date()),
      },
    });
    // Update todo's updated_at timestamp
    const updatedTodo = await tx.todo_app_todos.update({
      where: { id: props.todoId },
      data: { updated_at: toISOStringSafe(new Date()) },
      ...TodoAppTodoTransformer.select(),
    });
    return updatedTodo;
  });
  return await TodoAppTodoTransformer.transform(result);
}
