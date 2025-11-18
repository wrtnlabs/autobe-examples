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
  // Verify target user exists and is not deleted
  const targetUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Authorization check: user can only update their own account
  if (targetUser.id !== props.user.id) {
    throw new HttpException("You can only update your own account", 403);
  }

  // Check email uniqueness if email is being updated
  if (props.body.email !== undefined) {
    const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.userId },
        deleted_at: null,
      },
    });

    if (existingUser) {
      throw new HttpException("Email address is already in use", 409);
    }
  }

  // Build update data with only provided fields
  const updateData: Prisma.todo_list_usersUpdateInput = {
    updated_at: new Date(),
  };

  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Perform update
  const updatedUser = await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // Return updated user with proper date formatting
  return {
    id: updatedUser.id,
    email: updatedUser.email,
    status: updatedUser.status,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : undefined,
  };
}
