import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordResetComplete(props: {
  body: ITodoListUser.IPasswordResetComplete;
}): Promise<ITodoListUser.IPasswordResetCompleteResponse> {
  const currentTime = new Date();

  // Find the password reset token
  const resetToken =
    await MyGlobal.prisma.todo_list_password_reset_tokens.findUnique({
      where: { token: props.body.token },
    });

  // Validate token exists
  if (!resetToken) {
    return {
      success: false,
      message: "Invalid password reset token.",
    };
  }

  // Validate email matches
  if (resetToken.email !== props.body.email) {
    return {
      success: false,
      message: "Email address does not match the password reset token.",
    };
  }

  // Validate token hasn't been used
  if (resetToken.used_at !== null) {
    return {
      success: false,
      message: "This password reset token has already been used.",
    };
  }

  // Validate token hasn't expired
  if (currentTime >= resetToken.expires_at) {
    return {
      success: false,
      message: "This password reset token has expired.",
    };
  }

  // Find user by email
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });

  if (!user) {
    return {
      success: false,
      message: "User account not found.",
    };
  }

  // Hash the new password
  const hashedPassword = await PasswordUtil.hash(props.body.new_password);

  // Update user password and timestamp
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      password_hash: hashedPassword,
      updated_at: currentTime,
    },
  });

  // Mark token as used
  await MyGlobal.prisma.todo_list_password_reset_tokens.update({
    where: { id: resetToken.id },
    data: {
      used_at: currentTime,
    },
  });

  // Invalidate all active sessions for the user (logout from all devices)
  await MyGlobal.prisma.todo_list_user_sessions.updateMany({
    where: {
      user_id: user.id,
      expired_at: null,
    },
    data: {
      expired_at: currentTime,
    },
  });

  return {
    success: true,
    message:
      "Password has been successfully reset. All active sessions have been logged out for security.",
  };
}
