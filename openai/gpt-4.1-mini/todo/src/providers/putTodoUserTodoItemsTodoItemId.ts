import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodoItemsTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<"uuid">;
  body: ITodoItem.IUpdate;
}): Promise<ITodoItem> {
  const { user, todoItemId, body } = props;

  const todoItem = await MyGlobal.prisma.todo_todo_items.findUniqueOrThrow({
    where: {
      id: todoItemId,
    },
  });

  if (todoItem.todo_user_id !== user.id) {
    throw new HttpException("Forbidden: You cannot update this todo item", 403);
  }

  const updated = await MyGlobal.prisma.todo_todo_items.update({
    where: { id: todoItemId },
    data: {
      description: body.description ?? undefined,
      status: body.status ?? undefined,
      due_date: body.due_date === null ? null : (body.due_date ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    description: updated.description,
    status: typia.assert<"pending" | "completed">(updated.status),
    due_date:
      updated.due_date === null || updated.due_date === undefined
        ? updated.due_date
        : toISOStringSafe(updated.due_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
