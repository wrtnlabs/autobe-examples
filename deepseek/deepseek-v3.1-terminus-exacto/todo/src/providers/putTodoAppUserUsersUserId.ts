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
  // Verify target user exists and is not deleted
  const targetUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Authorization check - users can only update their own account
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden - can only update your own account",
      403,
    );
  }

  // Check email uniqueness if email is being updated
  if (props.body.email && props.body.email !== targetUser.email) {
    const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.userId },
      },
    });

    if (existingUser) {
      throw new HttpException("Email already in use", 409);
    }
  }

  // Build update data inline for Prisma
  const updateData: {
    email?: string;
    status?: "pending" | "active" | "suspended";
    password_hash?: string;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  if (props.body.password !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }

  // Perform update
  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  // Return updated user with proper date formatting
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    status: updated.status as "pending" | "active" | "suspended",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
