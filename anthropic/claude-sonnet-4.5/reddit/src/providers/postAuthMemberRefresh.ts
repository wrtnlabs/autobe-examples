import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberRefresh(props: {
  body: IRedditLikeMember.IRefresh;
}): Promise<IRedditLikeMember.IAuthorized> {
  const { body } = props;

  // Step 1: Verify and decode the refresh token
  let userId: string;
  try {
    const verifiedToken = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );

    if (typeof verifiedToken === "string") {
      throw new HttpException("Invalid token format", 401);
    }

    if (
      !verifiedToken ||
      typeof verifiedToken !== "object" ||
      !("id" in verifiedToken)
    ) {
      throw new HttpException("Invalid token payload", 401);
    }

    userId = verifiedToken.id;
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Find the session by refresh token
  const session = await MyGlobal.prisma.reddit_like_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      deleted_at: null,
    },
  });

  if (!session) {
    throw new HttpException("Session not found or has been revoked", 401);
  }

  // Step 3: Check if refresh token has expired
  const nowTimestamp = Date.now();
  const refreshExpirationTimestamp = new Date(
    session.refresh_token_expires_at,
  ).getTime();

  if (nowTimestamp >= refreshExpirationTimestamp) {
    throw new HttpException("Refresh token has expired", 401);
  }

  // Step 4: Get user data from database
  const user = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      id: session.reddit_like_user_id,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Step 5: Check for active platform suspension
  const activeSuspension =
    await MyGlobal.prisma.reddit_like_platform_suspensions.findFirst({
      where: {
        suspended_member_id: user.id,
        is_active: true,
        deleted_at: null,
      },
    });

  if (activeSuspension) {
    throw new HttpException("User account is suspended", 403);
  }

  // Step 6: Generate new access token with SAME payload structure as login/join
  const accessTokenExpirationTimestamp = nowTimestamp + 30 * 60 * 1000;
  const accessTokenExpiration = toISOStringSafe(
    new Date(accessTokenExpirationTimestamp),
  );

  const newAccessToken = jwt.sign(
    {
      id: user.id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Step 7: Update session with new access token and activity timestamp
  const currentTime = toISOStringSafe(new Date(nowTimestamp));

  await MyGlobal.prisma.reddit_like_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      access_token_expires_at: accessTokenExpiration,
      last_activity_at: currentTime,
      updated_at: currentTime,
    },
  });

  // Step 8: Return authorized response with new tokens and user profile
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    email_verified: user.email_verified,
    profile_bio: user.profile_bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
    post_karma: user.post_karma,
    comment_karma: user.comment_karma,
    token: {
      access: newAccessToken,
      refresh: session.refresh_token,
      expired_at: accessTokenExpiration,
      refreshable_until: toISOStringSafe(session.refresh_token_expires_at),
    },
  };
}
