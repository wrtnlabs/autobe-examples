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

export async function putTodoAppUserTodosTodoIdCompletion(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const currentTimestamp = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify the todo exists and belongs to the user
    const todo = await tx.todo_app_todos.findFirst({
      where: {
        id: props.todoId,
        todo_app_user_id: props.user.id,
        deleted_at: null,
      },
    });
    if (!todo) {
      throw new HttpException("Todo not found", 404);
    }
    // Get the latest completion status
    const latestCompletion = await tx.todo_app_todo_completions.findFirst({
      where: {
        todo_app_todo_id: props.todoId,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    const currentStatus = latestCompletion?.completed ?? false;
    const newStatus = !currentStatus;
    // Create a new completion record
    await tx.todo_app_todo_completions.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        completed: newStatus,
        created_at: currentTimestamp,
      },
    });
    // Update the todo's updated_at timestamp
    await tx.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        updated_at: currentTimestamp,
      },
    });
    // Create a history entry
    await tx.todo_app_todo_histories.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        todo_app_user_id: props.user.id,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      },
    });
    // Fetch the updated todo with all relationships
    const updatedTodo = await tx.todo_app_todos.findUnique({
      where: { id: props.todoId },
      ...TodoAppTodoTransformer.select(),
    });
    if (!updatedTodo) {
      throw new HttpException("Todo not found after update", 404);
    }
    return await TodoAppTodoTransformer.transform(updatedTodo);
  });
}
