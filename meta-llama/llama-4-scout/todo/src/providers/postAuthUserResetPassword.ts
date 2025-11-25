import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserPasswordReset";

export async function postAuthUserResetPassword(props: {
  body: ITodoListUserPasswordReset.IReset;
}): Promise<ITodoListUserPasswordReset.IResetResult> {
  // Current UTC time as ISO string
  const now = toISOStringSafe(new Date());

  // Look up the password reset event
  const passwordReset =
    await MyGlobal.prisma.todo_list_user_password_resets.findUnique({
      where: {
        reset_token: props.body.reset_token,
      },
    });

  // Validate: must exist, not expired, not consumed
  if (
    !passwordReset ||
    passwordReset.consumed_at !== null ||
    toISOStringSafe(passwordReset.expires_at) < now
  ) {
    // Always return generic result (no info leakage)
    return { reset: false };
  }

  // Hash the password (must never store plain password)
  const hashed = await PasswordUtil.hash(props.body.password);

  // Atomic transaction: update password + consume token
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_users.update({
      where: { id: passwordReset.todo_list_user_id },
      data: {
        password_hash: hashed,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.todo_list_user_password_resets.update({
      where: { id: passwordReset.id },
      data: { consumed_at: now },
    }),
  ]);

  return { reset: true };
}
