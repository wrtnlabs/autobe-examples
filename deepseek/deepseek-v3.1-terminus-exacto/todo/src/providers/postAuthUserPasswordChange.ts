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

export async function postAuthUserPasswordChange(props: {
  user: UserPayload;
  body: ITodoAppUser.IChangePassword;
}): Promise<ITodoAppUser.IChangePasswordResponse> {
  const { user, body } = props;

  // Verify authorization: user can only change their own password
  if (user.id !== body.user_id) {
    throw new HttpException(
      "Unauthorized: You can only change your own password",
      403,
    );
  }

  // Get user with current password hash
  const existingUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: body.user_id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!existingUser) {
    throw new HttpException(
      "User account not found, inactive, or deleted",
      404,
    );
  }

  // Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    existingUser.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password verification failed", 400);
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);
  const now = toISOStringSafe(new Date());

  // Update user with new password
  await MyGlobal.prisma.todo_app_users.update({
    where: { id: body.user_id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Return success response
  return {
    success: true,
    message: "Password changed successfully",
    updated_at: now,
  } satisfies ITodoAppUser.IChangePasswordResponse;
}
