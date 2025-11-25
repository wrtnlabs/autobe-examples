import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IEconomicDiscussionModerator.ILogin;
}): Promise<IEconomicDiscussionModerator.IAuthorized> {
  // Find moderator by username
  const moderator =
    await MyGlobal.prisma.economic_discussion_moderators.findFirst({
      where: { username: props.body.username },
    });

  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Calculate token expiration dates
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create new session
  const session =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.create({
      data: {
        id: v4(),
        economic_discussion_moderator_id: moderator.id,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
      },
    });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    email_verified: moderator.email_verified,
    two_factor_enabled: moderator.two_factor_enabled,
    moderation_level: moderator.moderation_level,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    token,
  } satisfies IEconomicDiscussionModerator.IAuthorized;
}
