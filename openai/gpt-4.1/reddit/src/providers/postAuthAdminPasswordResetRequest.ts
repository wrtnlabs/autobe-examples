import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

export async function postAuthAdminPasswordResetRequest(props: {
  body: ICommunityPlatformAdmin.IResetPasswordRequest;
}): Promise<ICommunityPlatformAdmin.IResetPasswordRequestResult> {
  const { email } = props.body;
  // Step 1: Try to find non-deleted admin with this email (case-insensitive match)
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      email,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (admin) {
    // Step 2: Confirm at least one verified token (consumed)
    const verified =
      await MyGlobal.prisma.community_platform_admin_verification_tokens.findFirst(
        {
          where: {
            community_platform_admin_id: admin.id,
            consumed: true,
          },
          select: { id: true },
        },
      );
    if (verified) {
      // Invalidate all previous unconsumed password reset tokens for this admin
      const now = toISOStringSafe(new Date());
      await MyGlobal.prisma.community_platform_admin_password_reset_tokens.updateMany(
        {
          where: {
            community_platform_admin_id: admin.id,
            consumed: false,
          },
          data: {
            consumed: true,
            consumed_at: now,
          },
        },
      );
      // Create new reset token (expires in 30 min)
      const expires_at = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));
      const token = v4();
      await MyGlobal.prisma.community_platform_admin_password_reset_tokens.create(
        {
          data: {
            id: v4(),
            community_platform_admin_id: admin.id,
            token,
            expires_at,
            consumed: false,
            created_at: now,
            consumed_at: null,
          },
        },
      );
      // TODO: Deliver token via email to admin; implementation not included here.
    }
  }
  // Always return empty result object per security policy; never reveal specifics.
  return {};
}
