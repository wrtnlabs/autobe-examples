import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserPasswordChange(props: {
  user: UserPayload;
  body: ITodoUser.IChangePassword;
}): Promise<ITodoUser.IChangePasswordResult> {
  // Step 1: Load user by ID
  const user = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: props.user.id },
  });
  if (!user) {
    throw new HttpException("The provided credentials are invalid.", 400);
  }

  // Step 2: Check that oldPassword is correct
  const passwordMatch = await PasswordUtil.verify(
    props.body.oldPassword,
    user.password_hash,
  );
  if (!passwordMatch) {
    throw new HttpException("The provided credentials are invalid.", 400);
  }

  // Step 3: Hash new password
  const newHashedPassword = await PasswordUtil.hash(props.body.newPassword);

  // Step 4: Update password_hash and updated_at atomically
  // Step 5: Invalidate all sessions for user (set expired_at for all active sessions)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_users.update({
      where: { id: props.user.id },
      data: {
        password_hash: newHashedPassword,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.todo_user_sessions.updateMany({
      where: {
        todo_user_id: props.user.id,
        expired_at: null,
      },
      data: {
        expired_at: now,
      },
    }),
  ]);

  return {
    success: true,
    message:
      "Password changed successfully. All sessions have been revoked. Please re-login with your new password.",
  };
}
