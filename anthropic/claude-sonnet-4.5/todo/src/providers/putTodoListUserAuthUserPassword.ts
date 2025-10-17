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

export async function putTodoListUserAuthUserPassword(props: {
  user: UserPayload;
  body: ITodoListUser.IChangePassword;
}): Promise<ITodoListUser.IPasswordChangeResponse> {
  const { user, body } = props;

  // Find the authenticated user
  const existingUser = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: user.id,
      deleted_at: null,
    },
  });

  if (!existingUser) {
    throw new HttpException("User account not found or has been deleted", 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    existingUser.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException(
      "Current password is incorrect. Please try again.",
      401,
    );
  }

  // Verify new password is different from current
  const isSamePassword = await PasswordUtil.verify(
    body.new_password,
    existingUser.password_hash,
  );

  if (isSamePassword) {
    throw new HttpException(
      "New password must be different from your current password",
      400,
    );
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Prepare timestamp once for consistency
  const now = toISOStringSafe(new Date());

  // Update password and updated_at timestamp
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Revoke all active refresh tokens for this user
  await MyGlobal.prisma.todo_list_refresh_tokens.updateMany({
    where: {
      todo_list_user_id: user.id,
      revoked_at: null,
    },
    data: {
      revoked_at: now,
    },
  });

  return {
    message:
      "Password successfully changed. All sessions have been terminated. Please log in again with your new password.",
  };
}
