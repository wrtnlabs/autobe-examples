import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordResetConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetConfirm";
import { ITodoListPasswordResetConfirmResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetConfirmResponse";

export async function postTodoListAuthPasswordResetConfirm(props: {
  body: ITodoListPasswordResetConfirm;
}): Promise<ITodoListPasswordResetConfirmResponse> {
  const { body } = props;

  // Verify and decode the reset token
  let userId: string;
  try {
    const decoded = jwt.verify(body.token, MyGlobal.env.JWT_SECRET_KEY) as {
      user_id: string;
      type: string;
    };

    // Verify this is a password reset token
    if (decoded.type !== "password_reset") {
      throw new HttpException("Invalid token type", 400);
    }

    userId = decoded.user_id;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpException("Password reset token has expired", 400);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpException("Invalid password reset token", 400);
    }
    throw error;
  }

  // Verify user exists and is not deleted
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Hash the new password
  const hashedPassword = await PasswordUtil.hash(body.new_password);

  // Update password and timestamp
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      password_hash: hashedPassword,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Invalidate all existing refresh tokens for security
  await MyGlobal.prisma.todo_list_refresh_tokens.deleteMany({
    where: {
      todo_list_user_id: user.id,
    },
  });

  return {
    message:
      "Password has been successfully reset. Please log in with your new password.",
  };
}
