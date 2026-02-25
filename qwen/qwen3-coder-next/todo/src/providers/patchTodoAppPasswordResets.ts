import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppPasswordResets(props: {
  body: ITodoAppUserPasswordReset.IRequest;
}): Promise<ITodoAppUserPasswordReset.IResponse> {
  // Find password reset token
  const resetToken =
    await MyGlobal.prisma.todo_app_user_password_resets.findUnique({
      where: { token: props.body.token },
    });
  // Validate token exists
  if (!resetToken) {
    throw new HttpException("Invalid or expired reset token", 400);
  }
  // Validate token not expired
  const expiredAt = resetToken.expired_at.toISOString();
  const now = new Date().toISOString();
  if (expiredAt <= now) {
    throw new HttpException("Invalid or expired reset token", 400);
  }
  // Find associated user
  const user = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: resetToken.todo_app_user_id },
  });
  // Hash new password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Update user password
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: user.id },
    data: {
      password_hash: hashedPassword,
    },
  });
  // Return success response
  return {
    message: "Password reset successfully",
  };
}
