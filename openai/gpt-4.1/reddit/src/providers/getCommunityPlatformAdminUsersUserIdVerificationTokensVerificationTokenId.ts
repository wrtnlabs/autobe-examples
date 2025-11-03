import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminUsersUserIdVerificationTokensVerificationTokenId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  verificationTokenId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserVerificationToken> {
  const record =
    await MyGlobal.prisma.community_platform_user_verification_tokens.findFirstOrThrow(
      {
        where: {
          id: props.verificationTokenId,
          community_platform_user_id: props.userId,
        },
      },
    );
  return {
    id: record.id,
    community_platform_user_id: record.community_platform_user_id,
    token: record.token,
    expires_at: toISOStringSafe(record.expires_at),
    consumed: record.consumed,
    created_at: toISOStringSafe(record.created_at),
    consumed_at:
      record.consumed_at === null
        ? undefined
        : toISOStringSafe(record.consumed_at),
  };
}
