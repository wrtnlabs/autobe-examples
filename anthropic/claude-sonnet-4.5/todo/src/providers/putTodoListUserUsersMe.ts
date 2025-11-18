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

export async function putTodoListUserUsersMe(props: {
  user: UserPayload;
  body: ITodoListUser.IUpdate;
}): Promise<ITodoListUser> {
  const userId = props.user.id;
  const currentSessionId = props.user.session_id;

  // Validate email uniqueness if email is being updated
  if (props.body.email !== undefined) {
    const normalizedEmail = props.body.email.toLowerCase();
    const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: userId },
      },
    });

    if (existingUser) {
      throw new HttpException(
        "Email address is already registered to another account.",
        400,
      );
    }
  }

  // Handle password update with current password verification
  let newPasswordHash: string | undefined = undefined;
  if (props.body.password !== undefined) {
    if (props.body.current_password === undefined) {
      throw new HttpException(
        "Current password is required when changing password.",
        400,
      );
    }

    // Fetch current user to verify password
    const currentUser = await MyGlobal.prisma.todo_list_users.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new HttpException("User not found.", 404);
    }

    // Verify current password
    const isPasswordValid = await PasswordUtil.verify(
      props.body.current_password,
      currentUser.password_hash,
    );

    if (!isPasswordValid) {
      throw new HttpException("Current password is incorrect.", 401);
    }

    // Hash new password
    newPasswordHash = await PasswordUtil.hash(props.body.password);

    // Invalidate all sessions except current one
    await MyGlobal.prisma.todo_list_user_sessions.updateMany({
      where: {
        todo_list_user_id: userId,
        id: { not: currentSessionId },
        expired_at: null,
      },
      data: {
        expired_at: new Date(),
      },
    });
  }

  // Build update data conditionally
  const hasUpdates =
    props.body.email !== undefined || newPasswordHash !== undefined;

  if (hasUpdates) {
    const updatedUser = await MyGlobal.prisma.todo_list_users.update({
      where: { id: userId },
      data: {
        ...(props.body.email !== undefined && {
          email: props.body.email.toLowerCase(),
        }),
        ...(newPasswordHash !== undefined && {
          password_hash: newPasswordHash,
        }),
        updated_at: new Date(),
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      created_at: toISOStringSafe(updatedUser.created_at),
      updated_at: toISOStringSafe(updatedUser.updated_at),
    };
  }

  // No updates provided - return current user data
  const currentUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: userId },
  });

  if (!currentUser) {
    throw new HttpException("User not found.", 404);
  }

  return {
    id: currentUser.id,
    email: currentUser.email,
    created_at: toISOStringSafe(currentUser.created_at),
    updated_at: toISOStringSafe(currentUser.updated_at),
  };
}
