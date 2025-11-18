import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordResetRequest(props: {
  body: ITodoListUser.IPasswordResetRequest;
}): Promise<ITodoListUser.IPasswordResetRequestResponse> {
  const { email } = props.body;

  // Find user by email (only non-deleted accounts)
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: email,
      deleted_at: null,
    },
  });

  // If user exists, create password reset token
  if (user) {
    // Generate cryptographically secure random token (32 bytes = 64 hex characters)
    const crypto = await import("crypto");

    const token = crypto.randomBytes(32).toString("hex");

    // Calculate timestamps as ISO strings
    const nowTimestamp = Date.now();
    const expiresAtTimestamp = nowTimestamp + 60 * 60 * 1000; // 1 hour from now

    const createdAt = toISOStringSafe(new Date(nowTimestamp));
    const expiresAt = toISOStringSafe(new Date(expiresAtTimestamp));

    // Create password reset token record
    await MyGlobal.prisma.todo_list_password_reset_tokens.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_list_user_id: user.id,
        token: token,
        email: email,
        created_at: createdAt,
        expires_at: expiresAt,
        used_at: null,
      },
    });

    // TODO: Send password reset email with token
    // Email service would send link like: https://app.example.com/password-reset?token=${token}
  }

  // Return generic success message (same response whether email exists or not)
  return {
    message:
      "If an account with that email exists, a password reset link has been sent.",
  };
}
