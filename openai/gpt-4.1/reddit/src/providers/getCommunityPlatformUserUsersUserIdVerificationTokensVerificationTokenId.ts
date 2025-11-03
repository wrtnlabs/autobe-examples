import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserVerificationToken";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserUsersUserIdVerificationTokensVerificationTokenId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  verificationTokenId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserVerificationToken> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You do not have permission to access this token",
      403,
    );
  }
  const token =
    await MyGlobal.prisma.community_platform_user_verification_tokens.findFirst(
      {
        where: {
          id: props.verificationTokenId,
          community_platform_user_id: props.userId,
        },
        select: {
          id: true,
          community_platform_user_id: true,
          token: true,
          expires_at: true,
          consumed: true,
          created_at: true,
          consumed_at: true,
        },
      },
    );
  if (!token) {
    throw new HttpException("Verification token not found", 404);
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
