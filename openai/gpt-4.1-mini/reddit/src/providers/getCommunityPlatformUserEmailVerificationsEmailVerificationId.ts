import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserEmailVerificationsEmailVerificationId(props: {
  user: UserPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserEmailVerification> {
  const record =
    await MyGlobal.prisma.community_platform_user_email_verifications.findFirst(
      {
        where: { id: props.emailVerificationId, deleted_at: null },
      },
    );
  if (!record) {
    throw new HttpException("Email verification token not found", 404);
  }
  if (record.user_id !== props.user.id) {
    throw new HttpException(
      "Unauthorized access to email verification token",
      403,
    );
  }
  return {
    id: record.id,
    user_id: record.user_id,
    token: record.token,
    is_verified: record.is_verified,
    expires_at: record.expires_at ? toISOStringSafe(record.expires_at) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
    deleted_at: null,
  };
}
