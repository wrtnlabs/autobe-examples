import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordResetToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminUsersUserIdPasswordResetTokensPasswordResetTokenId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  passwordResetTokenId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserPasswordResetToken> {
  const { userId, passwordResetTokenId } = props;

  const token =
    await MyGlobal.prisma.community_platform_user_password_reset_tokens.findFirst(
      {
        where: {
          id: passwordResetTokenId,
          community_platform_user_id: userId,
        },
      },
    );
  if (!token) {
    throw new HttpException("Password reset token not found", 404);
  }
  return {
    id: token.id,
    community_platform_user_id: token.community_platform_user_id,
    token: token.token,
    expires_at: toISOStringSafe(token.expires_at),
    consumed: token.consumed,
    created_at: toISOStringSafe(token.created_at),
    consumed_at: token.consumed_at
      ? toISOStringSafe(token.consumed_at)
      : undefined,
  };
}
