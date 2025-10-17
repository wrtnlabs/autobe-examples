import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IRedditLikeModerator.ICreate;
}): Promise<IRedditLikeModerator.IAuthorized> {
  const { body } = props;

  const existingUsername = await MyGlobal.prisma.reddit_like_users.findUnique({
    where: { username: body.username },
  });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  const existingEmail = await MyGlobal.prisma.reddit_like_users.findUnique({
    where: { email: body.email },
  });

  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(body.password);
  const userId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_like_users.create({
    data: {
      id: userId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      role: "moderator",
      email_verified: false,
      post_karma: 0,
      comment_karma: 0,
      show_karma_publicly: true,
      profile_privacy: "public",
      show_subscriptions_publicly: true,
      is_super_admin: false,
      created_at: now,
      updated_at: now,
    },
  });

  const moderator = await MyGlobal.prisma.reddit_like_moderators.create({
    data: {
      id: userId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      email_verified: false,
      created_at: now,
      updated_at: now,
    },
  });

  const verificationId = v4() as string & tags.Format<"uuid">;
  const verificationToken = v4() as string & tags.Format<"uuid">;
  const verificationExpiry = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );

  await MyGlobal.prisma.reddit_like_email_verifications.create({
    data: {
      id: verificationId,
      reddit_like_user_id: userId,
      email: body.email,
      verification_token: verificationToken,
      verification_type: "registration",
      expires_at: verificationExpiry,
      created_at: now,
    },
  });

  const accessTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 30 * 60 * 1000),
  );
  const refreshTokenExpiry = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: userId,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: userId,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.reddit_like_sessions.create({
    data: {
      id: sessionId,
      reddit_like_user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: accessTokenExpiry,
      refresh_token_expires_at: refreshTokenExpiry,
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: moderator.id as string & tags.Format<"uuid">,
    username: moderator.username,
    email: moderator.email as string & tags.Format<"email">,
    email_verified: moderator.email_verified,
    profile_bio: moderator.profile_bio ?? undefined,
    avatar_url: moderator.avatar_url ?? undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiry,
      refreshable_until: refreshTokenExpiry,
    },
  };
}
