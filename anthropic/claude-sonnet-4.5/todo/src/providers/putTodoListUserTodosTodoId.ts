import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const { user, todoId, body } = props;

  // Verify todo exists and check ownership
  const existingTodo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      deleted_at: null,
    },
  });

  if (!existingTodo) {
    throw new HttpException("Todo not found", 404);
  }

  // Authorization: Verify ownership
  if (existingTodo.todo_list_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own todos",
      403,
    );
  }

  // Update todo with provided fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: todoId },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      completed: body.completed ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title,
    description: updated.description ? updated.description : undefined,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
