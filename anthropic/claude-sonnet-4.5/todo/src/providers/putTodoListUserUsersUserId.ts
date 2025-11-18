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

export async function putTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  // Authorization: Users can only update their own profile
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only update your own account", 403);
  }

  // Verify user exists and is not deleted
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (existingUser === null) {
    throw new HttpException("User not found", 404);
  }

  // Email uniqueness check if email is being updated
  if (
    props.body.email !== undefined &&
    props.body.email !== existingUser.email
  ) {
    const emailExists = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.userId },
      },
    });

    if (emailExists !== null) {
      throw new HttpException("Email address is already in use", 409);
    }
  }

  // Update user with provided fields
  const updatedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: new Date(),
    },
  });

  // Transform to API response format
  return {
    id: updatedUser.id as string & tags.Format<"uuid">,
    email: updatedUser.email as string & tags.Format<"email">,
    name: updatedUser.name ?? undefined,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : undefined,
  };
}
