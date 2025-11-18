import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.IUpdate;
}): Promise<ITodoTodo> {
  // 1. Find the todo item and verify ownership
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
    include: { user: true },
  });
  if (!todo) {
    throw new HttpException("Todo not found or not owned by user", 404);
  }

  // 2. Build update payload
  const updates: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.description !== undefined) {
    updates.description = props.body.description;
  }
  let completedStatus = todo.is_completed;
  if (props.body.is_completed !== undefined) {
    updates.is_completed = props.body.is_completed;
    completedStatus = props.body.is_completed;
    if (props.body.is_completed) {
      updates.completed_at = toISOStringSafe(new Date());
    } else {
      updates.completed_at = null;
    }
  }

  // 3. Apply update
  const updated = await MyGlobal.prisma.todo_todos.update({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
    data: updates,
    include: { user: true },
  });

  // 4. Build response
  return {
    id: updated.id,
    description: updated.description,
    is_completed: updated.is_completed,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    user: {
      id: updated.user.id,
      email: updated.user.email,
      created_at: toISOStringSafe(updated.user.created_at),
      updated_at: toISOStringSafe(updated.user.updated_at),
    },
  };
}
