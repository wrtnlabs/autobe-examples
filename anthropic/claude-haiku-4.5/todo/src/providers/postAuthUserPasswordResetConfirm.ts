import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordResetConfirm(props: {
  body: ITodoListUser.IPasswordResetConfirm;
}): Promise<ITodoListUser.IPasswordResetConfirmResponse> {
  // Find the password reset token with associated user
  const resetToken =
    await MyGlobal.prisma.todo_list_password_reset_tokens.findUnique({
      where: { token: props.body.token },
      include: { user: true },
    });

  // Validate token exists
  if (!resetToken) {
    throw new HttpException("Invalid or expired password reset token.", 400);
  }

  // Validate token is not already consumed
  if (resetToken.consumed_at !== null) {
    throw new HttpException(
      "This password reset token has already been used.",
      400,
    );
  }

  // Validate token is not expired
  const currentTime = new Date();
  if (currentTime > resetToken.expires_at) {
    throw new HttpException(
      "Password reset token has expired. Please request a new reset link.",
      400,
    );
  }

  // Validate associated user exists and is not deleted
  if (!resetToken.user || resetToken.user.deleted_at !== null) {
    throw new HttpException("User account not found or has been deleted.", 400);
  }

  // Hash the new password
  const hashedPassword = await PasswordUtil.hash(props.body.new_password);

  // Current timestamp for all updates
  const resetCompletedAt = toISOStringSafe(currentTime);

  // Execute all updates atomically
  await MyGlobal.prisma.$transaction([
    // Update user's password and updated_at
    MyGlobal.prisma.todo_list_users.update({
      where: { id: resetToken.todo_list_user_id },
      data: {
        password_hash: hashedPassword,
        updated_at: currentTime,
      },
    }),

    // Mark token as consumed
    MyGlobal.prisma.todo_list_password_reset_tokens.update({
      where: { id: resetToken.id },
      data: {
        consumed_at: currentTime,
      },
    }),

    // Expire all active sessions for this user to force re-authentication
    MyGlobal.prisma.todo_list_sessions.updateMany({
      where: {
        todo_list_user_id: resetToken.todo_list_user_id,
        expired_at: null,
      },
      data: {
        expired_at: currentTime,
      },
    }),
  ]);

  // Build response with proper types from user object
  const user = resetToken.user;
  const response: ITodoListUser.IPasswordResetConfirmResponse = {
    id: user.id,
    email: user.email,
    reset_completed_at: resetCompletedAt,
    sessions_invalidated: true,
    message:
      "Password has been successfully reset. Please log in with your new password.",
  };

  return response;
}
