import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function postAuthUserPasswordReset(props: {
  body: ITodoUser.IPasswordResetRequest;
}): Promise<ITodoUser.IPasswordResetResponse> {
  const { email } = props.body;

  // Generate secure reset token
  const resetToken = v4() as string & tags.Format<"uuid">;

  // Set expiration 30 minutes from now
  const expiresAt = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));

  // Find user first to determine if they exist
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: { email, deleted_at: null },
  });

  if (user) {
    // Update the specific user record
    await MyGlobal.prisma.todo_users.update({
      where: { id: user.id },
      data: {
        reset_password_token: resetToken,
        reset_password_expires: expiresAt,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }

  // Always return generic success message regardless of user existence
  // This prevents email enumeration attacks - don't want attackers
  // to know which emails are registered in the system
  return {
    message:
      "If the email exists in our system, password reset instructions have been sent.",
  } satisfies ITodoUser.IPasswordResetResponse;
}
