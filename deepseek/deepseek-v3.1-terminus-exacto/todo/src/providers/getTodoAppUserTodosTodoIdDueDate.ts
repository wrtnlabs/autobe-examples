import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoDueDateField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDueDateField";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppUserTodosTodoIdDueDate(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoDueDateField> {
  // Query the due date field with ownership verification in a single query
  const dueDateField =
    await MyGlobal.prisma.todo_app_todo_due_date_fields.findUnique({
      where: { todo_app_todo_id: props.todoId },
      include: {
        todo: {
          select: {
            id: true,
            todo_app_user_id: true,
            deleted_at: true,
          },
        },
      },
    });
  // Check if the due date field exists and the user owns the todo
  if (
    !dueDateField ||
    dueDateField.todo.todo_app_user_id !== props.user.id ||
    dueDateField.todo.deleted_at !== null
  ) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Transform the result using the transformer
  return {
    id: dueDateField.id,
    due_date: dueDateField.due_date
      ? toISOStringSafe(dueDateField.due_date)
      : null,
    todo_app_todo_id: dueDateField.todo_app_todo_id,
  };
}
