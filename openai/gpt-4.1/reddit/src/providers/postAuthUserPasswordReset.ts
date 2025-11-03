import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

export async function postAuthUserPasswordReset(props: {
  body: ICommunityPlatformUser.IResetPasswordRequest;
}): Promise<ICommunityPlatformUser.IResetPasswordResponse> {
  const email = props.body.email;
  // Check for existing user by email
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { email },
    select: { id: true },
  });
  if (user) {
    const now = toISOStringSafe(new Date());
    // Platform policy: token expiry 1 hour from now as standard security
    const expiresAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
    // Issue password reset token row
    await MyGlobal.prisma.community_platform_user_password_reset_tokens.create({
      data: {
        id: v4(),
        community_platform_user_id: user.id,
        token: v4(),
        expires_at: expiresAt,
        consumed: false,
        created_at: now,
        consumed_at: null,
      },
    });
    // Side effect: email notification handled elsewhere
  }
  // Always return fixed message, for privacy/security
  return {
    message:
      "If an account with that email exists, a password reset email has been sent.",
  };
}
