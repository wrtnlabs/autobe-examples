import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existing) {
    throw new HttpException("Todo item not found", 404);
  }

  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete this todo item",
      403,
    );
  }

  const deleted = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date(),
    },
  });

  return {
    id: deleted.id as string & tags.Format<"uuid">,
    todo_list_user_id: deleted.todo_list_user_id as string &
      tags.Format<"uuid">,
    title: deleted.title,
    completed: deleted.completed,
    completed_at: deleted.completed_at
      ? toISOStringSafe(deleted.completed_at)
      : undefined,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at: deleted.deleted_at
      ? toISOStringSafe(deleted.deleted_at)
      : undefined,
  };
}
