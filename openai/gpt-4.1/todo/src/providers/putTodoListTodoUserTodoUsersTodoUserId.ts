import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function putTodoListTodoUserTodoUsersTodoUserId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  body: ITodoListTodouser.IUpdate;
}): Promise<ITodoListTodouser> {
  // Authorization: Only the authenticated user can update their own account
  if (props.todoUser.id !== props.todoUserId) {
    throw new HttpException(
      "Forbidden: Cannot update another user's account",
      403,
    );
  }

  // Prepare update data
  const updates: Record<string, unknown> = {};

  // If email is provided and different, check uniqueness
  if (props.body.email !== undefined) {
    const existing = await MyGlobal.prisma.todo_list_todousers.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.todoUserId },
      },
      select: { id: true },
    });
    if (existing) {
      throw new HttpException(
        "Email address already in use by another user",
        409,
      );
    }
    updates.email = props.body.email;
  }

  // If password is provided, hash and update
  if (props.body.password !== undefined) {
    const hash = await PasswordUtil.hash(props.body.password);
    updates.password_hash = hash;
  }

  // Always update updated_at
  updates.updated_at = toISOStringSafe(new Date());

  // Update the user row
  const updated = await MyGlobal.prisma.todo_list_todousers.update({
    where: { id: props.todoUserId },
    data: updates,
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
