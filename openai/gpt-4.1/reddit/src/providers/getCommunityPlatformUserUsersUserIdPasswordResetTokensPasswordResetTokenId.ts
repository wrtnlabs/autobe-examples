import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordResetToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserUsersUserIdPasswordResetTokensPasswordResetTokenId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  passwordResetTokenId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserPasswordResetToken> {
  // Only the owner/user can access their own password reset tokens
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You are not authorized to access this token",
      403,
    );
  }

  const token =
    await MyGlobal.prisma.community_platform_user_password_reset_tokens.findFirst(
      {
        where: {
          id: props.passwordResetTokenId,
          community_platform_user_id: props.userId,
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
    consumed_at: token.consumed_at ? toISOStringSafe(token.consumed_at) : null,
  };
}
