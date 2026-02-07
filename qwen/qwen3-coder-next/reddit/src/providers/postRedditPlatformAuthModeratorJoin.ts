import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthModeratorJoin(props: {
  body: IRedditPlatformModerator.IJoin;
}): Promise<IRedditPlatformModerator.IAuthorized> {
  // 1. Check for duplicate moderator
  const existingModerator =
    await MyGlobal.prisma.reddit_platform_moderators.findFirst({
      where: {},
    });
  if (existingModerator) {
    throw new HttpException("Moderator already exists for this user", 409);
  }
  // 2. Create the moderator account with all required fields
  const moderator = await MyGlobal.prisma.reddit_platform_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      karma_score: 0,
      status: "active",
      user_id: "" as string & tags.Format<"uuid">,
      display_name: "" as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 3. Create session record with all required fields
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_platform_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_platform_moderator_id: moderator.id,
        ip: "127.0.0.1",
        href: "",
        access_token: "",
        refresh_token: "",
        expires_at: toISOStringSafe(accessExpires),
        refresh_expires_at: toISOStringSafe(refreshExpires),
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // 4. Create email verification token
  const emailVerificationToken = v4();
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.reddit_platform_moderator_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_platform_moderator_id: moderator.id,
      token: emailVerificationToken,
      expires_at: toISOStringSafe(emailVerificationExpires),
      used_at: null,
    },
  });
  // 5. Generate JWT tokens
  const accessPayload = {
    type: "moderator" as const,
    id: moderator.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    type: "moderator" as const,
    id: moderator.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: toISOStringSafe(new Date()),
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30m",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
    issuer: "autobe",
  });
  // 6. Update session with generated tokens
  await MyGlobal.prisma.reddit_platform_moderator_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 7. Return authorized response
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
