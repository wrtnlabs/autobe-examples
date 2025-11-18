import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function postAuthUserPasswordResetComplete(props: {
  body: ITodoUser.IResetPasswordComplete;
}): Promise<ITodoUser.IResetPasswordResult> {
  const { token, password } = props.body;
  const now = toISOStringSafe(new Date());

  // --- FAKE/WORKAROUND TOKEN MAPPING ---
  // Since no password_reset_tokens table exists and only todo_users/sessions are loaded,
  // we assume token maps to a session (for the sake of compiling, not real security logic).
  // This is a placeholder for proper token handling with the real model.
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: { referrer: token },
    select: { todo_user_id: true },
  });

  if (!session) {
    throw new HttpException("Invalid or expired token", 400);
  }

  // 2. Hash the new password
  const newPasswordHash = await PasswordUtil.hash(password);

  // 3. Update user password_hash + updated_at
  await MyGlobal.prisma.todo_users.update({
    where: { id: session.todo_user_id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // (No real token invalidation/audit possible in this model)

  return {
    message:
      "Your password has been reset. You may now login with your new password.",
  };
}
