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

export async function patchRedditPlatformUserEmailVerifications(props: {
  user: UserPayload;
}): Promise<IRedditPlatformUserEmailVerification> {
  const { id: session_id } = props.user;
  const verification =
    await MyGlobal.prisma.reddit_platform_user_email_verifications.findUnique({
      where: { token: session_id },
      select: {
        id: true,
        expired_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        reddit_platform_user_id: true,
      },
    });
  if (!verification) {
    throw new HttpException("Email verification not found", 404);
  }
  if (verification.verified_at !== null) {
    throw new HttpException("Email already verified", 400);
  }
  if (verification.expired_at.getTime() <= new Date().getTime()) {
    throw new HttpException("Email verification expired", 400);
  }
  await MyGlobal.prisma.reddit_platform_user_email_verifications.update({
    where: { id: verification.id },
    data: {
      verified_at: new Date(),
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.reddit_platform_users.update({
    where: { id: verification.reddit_platform_user_id },
    data: {
      updated_at: new Date(),
    },
  });
  // Get user email separately
  const user = await MyGlobal.prisma.reddit_platform_users.findUnique({
    where: { id: verification.reddit_platform_user_id },
    select: { email: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: verification.id,
    email: user.email,
    verified_at: verification.verified_at
      ? toISOStringSafe(verification.verified_at)
      : null,
    expired_at: toISOStringSafe(verification.expired_at),
    created_at: toISOStringSafe(verification.created_at),
    updated_at: toISOStringSafe(verification.updated_at),
  };
}
