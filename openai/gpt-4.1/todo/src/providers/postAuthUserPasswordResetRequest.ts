import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function postAuthUserPasswordResetRequest(props: {
  body: ITodoUser.IResetPasswordRequest;
}): Promise<ITodoUser.IResetPasswordResponse> {
  // For privacy and security, always respond with 'success: true', revealing nothing about the existence of this email.
  // No state change occurs, and no error is thrown for non-existing users.

  // Lookup user for potential reset token (actual token dispatch is handled out-of-band, not in this function)
  const user = await MyGlobal.prisma.todo_users.findUnique({
    where: { email: props.body.email },
    select: { id: true }, // Only needs to confirm existence if at all
  });

  // If user exists, code to dispatch email with reset token would be placed here (stubbed out for security).
  // For example: if (user) { await EmailUtil.sendResetToken(user.id, props.body.email); }

  // Always respond generically to avoid account enumeration attacks.
  return { success: true };
}
