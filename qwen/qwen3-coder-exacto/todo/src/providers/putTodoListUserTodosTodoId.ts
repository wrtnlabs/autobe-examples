import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const input = props.body ?? {};
  // Ensure at least one valid updatable field is present
  const hasValidField =
    input.title !== undefined ||
    input.description !== undefined ||
    input.completed !== undefined ||
    input.due_date !== undefined;
  if (!hasValidField) {
    throw new HttpException(
      "At least one updatable field (title, description, completed, due_date) must be provided.",
      400,
    );
  }

  // Fetch the todo for this user and todoId
  const existing = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
  });
  if (!existing) {
    throw new HttpException("Todo not found or not owned by user.", 404);
  }

  // Prepare update values -- don't allow changing user_id
  const updateData: Record<string, unknown> = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.completed !== undefined ? { completed: input.completed } : {}),
    ...(input.due_date !== undefined ? { due_date: input.due_date } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: {
      id: props.todoId,
    },
    data: updateData,
  });

  // Compose user summary
  const userSummary: ITodoListUser.ISummary = {
    id: props.user.id,
  };

  return {
    id: updated.id,
    title: updated.title,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    user: userSummary,
  };
}
