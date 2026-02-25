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

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Find and verify ownership of the todo
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      user_id: props.user.id,
      is_deleted: false,
    },
    select: {
      title: true,
      description: true,
      start_date: true,
      due_date: true,
    },
  });
  if (existingTodo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // Build update data with only changed fields
  const updateData: {
    title?: string;
    description?: string | null;
    start_date?: Date | null;
    due_date?: Date | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  let hasChanges = false;
  // Title change detection
  if (props.body.title !== undefined) {
    const trimmedTitle = props.body.title.trim();
    if (trimmedTitle !== existingTodo.title) {
      updateData.title = trimmedTitle;
      hasChanges = true;
    }
  }
  // Description change detection
  if (props.body.description !== undefined) {
    if (props.body.description !== existingTodo.description) {
      updateData.description = props.body.description;
      hasChanges = true;
    }
  }
  // Helper for date comparison
  const datesEqual = (a: Date | null, b: Date | null): boolean => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a.getTime() === b.getTime();
  };
  // Start date change detection
  if (props.body.start_date !== undefined) {
    const newStartDate =
      props.body.start_date !== null ? new Date(props.body.start_date) : null;
    if (!datesEqual(newStartDate, existingTodo.start_date)) {
      updateData.start_date = newStartDate;
      hasChanges = true;
    }
  }
  // Due date change detection
  if (props.body.due_date !== undefined) {
    const newDueDate =
      props.body.due_date !== null ? new Date(props.body.due_date) : null;
    if (!datesEqual(newDueDate, existingTodo.due_date)) {
      updateData.due_date = newDueDate;
      hasChanges = true;
    }
  }
  // No changes - return existing todo
  if (!hasChanges) {
    const unchangedTodo =
      await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
        where: { id: props.todoId },
        ...TodoAppTodoTransformer.select(),
      });
    return await TodoAppTodoTransformer.transform(unchangedTodo);
  }
  // Perform update
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(updatedTodo);
}
