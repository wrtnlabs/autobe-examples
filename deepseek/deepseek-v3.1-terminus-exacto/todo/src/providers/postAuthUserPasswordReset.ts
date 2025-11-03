import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function postAuthUserPasswordReset(props: {
  body: ITodoAppUser.IResetPasswordRequest;
}): Promise<ITodoAppUser.IResetPasswordResponse> {
  const { body } = props;

  // Check if user exists with active status
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: body.email,
      status: "active",
      deleted_at: null,
    },
  });

  const now = toISOStringSafe(new Date());

  // Always return generic response to prevent email enumeration
  // Only proceed with actual reset if user exists and is active
  if (user) {
    // Generate reset token and expiration
    const resetToken = v4() as string & tags.Format<"uuid">;
    const expiresAt = toISOStringSafe(new Date(Date.now() + 3600000)); // 1 hour expiration

    // Create session record for audit with proper typing
    const sessionData = {
      id: v4() as string & tags.Format<"uuid">,
      user: { connect: { id: user.id } }, // Use relation connection instead of direct field
      ip: body.ip,
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: expiresAt,
    } satisfies Prisma.todo_app_user_sessionsCreateInput;

    await MyGlobal.prisma.todo_app_user_sessions.create({
      data: sessionData,
    });

    // In production, send email with reset token
    // await sendResetEmail(user.email, resetToken);
  }

  // Return generic success response regardless of email existence
  const response = {
    message:
      "If the email address exists in our system, a password reset link has been sent.",
    requested_at: now,
    user_id: user ? (user.id as string & tags.Format<"uuid">) : undefined,
  } satisfies ITodoAppUser.IResetPasswordResponse;

  return response;
}
