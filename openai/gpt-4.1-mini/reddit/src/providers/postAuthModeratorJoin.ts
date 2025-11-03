import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorJoin(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityModerator.IJoin;
}): Promise<IRedditCommunityModerator.IAuthorized> {
  // Check for duplicate user email
  const existingUser = await MyGlobal.prisma.reddit_community_user.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser !== null) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);

  // Generate ids and timestamps
  const userId = v4() as string & tags.Format<"uuid">;
  const moderatorId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const accessExpiry = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour

  // Create user
  const user = await MyGlobal.prisma.reddit_community_user.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    },
  });

  // Create moderator
  const moderator = await MyGlobal.prisma.reddit_community_moderator.create({
    data: {
      id: moderatorId,
      user_id: user.id,
      created_at: now,
    },
  });

  // Create session
  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id: sessionId,
        reddit_community_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpiry,
      },
    });

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorization response
  return {
    id: moderator.id,
    user_id: user.id,
    created_at: now,
    email: user.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiry,
      refreshable_until: refreshExpiry,
    },
  };
}
