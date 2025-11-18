import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodoListUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Verify user owns the account being updated
  if (props.user.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Check if user account exists and is not deleted
  const existingUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  // Check if new email is already taken by another user
  const existingEmail = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email,
      id: { not: props.userId },
      deleted_at: null,
    },
  });

  if (existingEmail) {
    throw new HttpException("Email already in use", 409);
  }

  // Update the user record
  const updatedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: {
      email: props.body.email,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated user with proper date formatting
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: updatedUser.updated_at
      ? toISOStringSafe(updatedUser.updated_at)
      : undefined,
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : undefined,
  };
}
