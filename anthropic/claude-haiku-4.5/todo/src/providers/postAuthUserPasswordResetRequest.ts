import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const { randomBytes, createHash } = await import("crypto");

  const email = props.body.email.toLowerCase();

  // Find user by email - case-insensitive search for active users
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email },
  });

  // Return generic success message for security (prevents email enumeration)
  // Only create token if user exists and is active (deleted_at is null)
  if (user && user.deleted_at === null) {
    // Generate cryptographically secure random token (32 bytes)
    const tokenBuffer = randomBytes(32);
    const plainToken = tokenBuffer.toString("hex");

    // Hash token before storage to prevent exposure if database is compromised
    const hashedToken = createHash("sha256").update(plainToken).digest("hex");

    // Calculate expiration time: 1 hour from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

    // Create password reset token in database
    await MyGlobal.prisma.todo_list_password_reset_tokens.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_list_user_id: user.id,
        token: hashedToken,
        created_at: now,
        expires_at: expiresAt,
        consumed_at: null,
      },
    });

    // In production, send reset email asynchronously with plainToken
    // This would be: await emailService.sendPasswordResetEmail(user.email, plainToken);
    // The plainToken is never stored in database, only the hash
  }

  // Return generic success message regardless of whether email exists
  // This prevents attackers from discovering registered email addresses
  return {
    message:
      "If an account with this email exists, a password reset link has been sent.",
  };
}
