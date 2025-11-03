import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminPasswordResetToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminAdminsAdminIdPasswordResetTokensPasswordResetTokenId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  passwordResetTokenId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdminPasswordResetToken> {
  const token =
    await MyGlobal.prisma.community_platform_admin_password_reset_tokens.findFirst(
      {
        where: {
          id: props.passwordResetTokenId,
          community_platform_admin_id: props.adminId,
        },
        select: {
          id: true,
          community_platform_admin_id: true,
          expires_at: true,
          consumed: true,
          created_at: true,
          consumed_at: true,
        },
      },
    );
  if (!token)
    throw new HttpException(
      "Password reset token not found or does not belong to specified admin",
      404,
    );
  return {
    id: token.id,
    community_platform_admin_id: token.community_platform_admin_id,
    expires_at: toISOStringSafe(token.expires_at),
    consumed: token.consumed,
    created_at: toISOStringSafe(token.created_at),
    consumed_at: token.consumed_at
      ? toISOStringSafe(token.consumed_at)
      : undefined,
  };
}
