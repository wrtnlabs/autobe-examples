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

export async function postAuthUserPasswordChange(props: {
  user: UserPayload;
  body: ITodoListUser.IPasswordChange;
}): Promise<ITodoListUser.IPasswordChangeResponse> {
  // Fetch the user record to verify current password
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found or has been deleted", 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    props.body.current_password,
    user.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  // Hash the new password
  const newPasswordHash = await PasswordUtil.hash(props.body.new_password);

  // Update user's password in database
  await MyGlobal.prisma.todo_list_users.update({
    where: { id: props.user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Invalidate all other sessions (logout from all other devices)
  await MyGlobal.prisma.todo_list_user_sessions.updateMany({
    where: {
      user_id: props.user.id,
      id: { not: props.user.session_id },
      expired_at: null,
    },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });

  return {
    success: true,
    message:
      "Password changed successfully. All other devices have been logged out for security.",
  };
}
