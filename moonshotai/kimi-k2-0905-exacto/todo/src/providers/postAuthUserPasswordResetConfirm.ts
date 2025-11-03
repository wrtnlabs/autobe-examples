import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function postAuthUserPasswordResetConfirm(props: {
  body: ITodoUser.IPasswordResetConfirm;
}): Promise<ITodoUser.IPasswordResetConfirmResponse> {
  const { reset_password_token, password, confirm_password } = props.body;

  // Validate passwords match
  if (password !== confirm_password) {
    throw new HttpException("Password and confirm password do not match", 400);
  }

  // Find user by reset token
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      reset_password_token: reset_password_token,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("Invalid reset token", 400);
  }

  // Check if token has expired
  if (!user.reset_password_expires) {
    throw new HttpException("No valid reset request found", 400);
  }

  const now = toISOStringSafe(new Date());
  if (user.reset_password_expires <= new Date(now)) {
    throw new HttpException("Reset token has expired", 400);
  }

  // Hash new password
  const hashedPassword = await PasswordUtil.hash(password);

  // Update user password and clear reset fields
  const updated = await MyGlobal.prisma.todo_users.update({
    where: { id: user.id },
    data: {
      password_hash: hashedPassword,
      reset_password_token: null,
      reset_password_expires: null,
      updated_at: now,
    },
  });

  return {
    success: true,
  };
}
