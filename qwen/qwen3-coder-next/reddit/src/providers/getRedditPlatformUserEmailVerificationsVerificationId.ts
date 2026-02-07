import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserEmailVerification";
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

export async function getRedditPlatformUserEmailVerificationsVerificationId(props: {
  user: UserPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformUserEmailVerification> {
  const verification =
    await MyGlobal.prisma.reddit_platform_user_email_verifications.findUnique({
      where: { id: props.verificationId },
    });
  if (!verification) {
    throw new HttpException("Email verification not found", 404);
  }
  const result: IRedditPlatformUserEmailVerification = {
    id: verification.id as string & tags.Format<"uuid">,
    reddit_platform_user_id: verification.reddit_platform_user_id as string &
      tags.Format<"uuid">,
    token: verification.token,
    expired_at: toISOStringSafe(verification.expired_at),
    verified_at: verification.verified_at
      ? toISOStringSafe(verification.verified_at)
      : null,
    created_at: toISOStringSafe(verification.created_at),
    updated_at: toISOStringSafe(verification.updated_at),
  };
  return result;
}
