import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

export async function postAuthAdminPasswordResetRequest(props: {
  body: IRedditLikeAdmin.IPasswordResetRequest;
}): Promise<IRedditLikeAdmin.IPasswordResetRequestResponse> {
  const { body } = props;

  // Find admin user by email (role must be 'admin')
  const adminUser = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      email: body.email,
      role: "admin",
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
    },
  });

  // Only create reset token if admin user exists
  if (adminUser) {
    // Generate cryptographically secure reset token
    const resetToken = v4() as string & tags.Format<"uuid">;

    // Calculate current time and expiration (1 hour from now)
    const createdAt = toISOStringSafe(new Date());
    const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));

    // Create password reset record
    await MyGlobal.prisma.reddit_like_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_user_id: adminUser.id,
        email: adminUser.email,
        reset_token: resetToken,
        expires_at: expiresAt,
        used_at: null,
        created_at: createdAt,
      },
    });
  }

  // Return generic success response (anti-enumeration security)
  // Same response whether email exists or not
  return {
    success: true,
    message:
      "If an admin account exists with this email address, a password reset link has been sent.",
  };
}
