import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  // Check authorization - user can only update their own account
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only update your own account", 403);
  }

  // Check if user exists and is not deleted
  const existingUser = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!existingUser) {
    throw new HttpException("User not found", 404);
  }

  if (existingUser.deleted_at !== null) {
    throw new HttpException("Cannot update deleted account", 400);
  }

  // Check email uniqueness if email is being updated
  if (
    props.body.email !== undefined &&
    props.body.email !== existingUser.email
  ) {
    const existingEmail = await MyGlobal.prisma.todo_app_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    });

    if (existingEmail) {
      throw new HttpException("Email already in use", 400);
    }
  }

  // Update user
  const updatedUser = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      updated_at: new Date(),
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : undefined,
  };
}
