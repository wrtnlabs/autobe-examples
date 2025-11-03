import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

export async function postAuthAdminPasswordResetConfirm(props: {
  body: ICommunityPlatformAdmin.IResetPasswordConfirm;
}): Promise<ICommunityPlatformAdmin.IResetPasswordConfirmResult> {
  const { email, token, password } = props.body;

  // Step 1: Find admin by email, not soft deleted
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });
  if (!admin) {
    return {
      success: false,
      message: "Invalid admin account or this account is inactive.",
    };
  }

  // Step 2: Find password reset token for admin (by token), not expired/consumed
  const resetToken =
    await MyGlobal.prisma.community_platform_admin_password_reset_tokens.findFirst(
      {
        where: {
          token,
          community_platform_admin_id: admin.id,
          consumed: false,
        },
      },
    );
  if (!resetToken) {
    return {
      success: false,
      message: "Invalid or missing password reset token.",
    };
  }

  // Check if reset token is expired: expires_at <= now
  const now = toISOStringSafe(new Date());
  // Convert both ISO datetime strings to timestamps for comparison
  const expiresAtTimestamp = Date.parse(toISOStringSafe(resetToken.expires_at));
  const nowTimestamp = Date.parse(now);
  if (expiresAtTimestamp < nowTimestamp) {
    return {
      success: false,
      message: "This reset token has expired.",
    };
  }

  // Step 3: Hash new password
  const password_hash = await PasswordUtil.hash(password);

  // Step 4: Update admin password_hash + updated_at
  await MyGlobal.prisma.community_platform_admins.update({
    where: { id: admin.id },
    data: {
      password_hash,
      updated_at: now,
    },
  });

  // Step 5: Mark token as consumed
  await MyGlobal.prisma.community_platform_admin_password_reset_tokens.update({
    where: { id: resetToken.id },
    data: {
      consumed: true,
      consumed_at: now,
    },
  });

  // Step 6: Delete (revoke) all prior admin sessions
  await MyGlobal.prisma.community_platform_admin_sessions.deleteMany({
    where: {
      community_platform_admin_id: admin.id,
    },
  });

  // Step 7: Return success (business message)
  return {
    success: true,
    message: "Password has been reset successfully.",
  };
}
