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

export async function postAuthModeratorRefresh(props: {
  body: IRedditLikeModerator.IRefresh;
}): Promise<IRedditLikeModerator.IAuthorized> {
  const { body } = props;

  // Step 1: Verify and decode the refresh token
  let decoded: { userId?: string; username?: string; role?: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { userId?: string; username?: string; role?: string };
  } catch (error) {
    throw new HttpException(
      "Invalid or expired refresh token. Please log in again.",
      401,
    );
  }

  // Step 2: Find the session associated with this refresh token
  const session = await MyGlobal.prisma.reddit_like_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      deleted_at: null,
    },
  });

  if (!session) {
    throw new HttpException(
      "Session not found or has been revoked. Please log in again.",
      401,
    );
  }

  // Step 3: Check if refresh token has expired (30-day expiration)
  const currentTime = toISOStringSafe(new Date());
  const refreshExpiresAt = toISOStringSafe(session.refresh_token_expires_at);

  if (refreshExpiresAt < currentTime) {
    throw new HttpException(
      "Refresh token has expired. Please log in again.",
      401,
    );
  }

  // Step 4: Find the moderator user account
  const user = await MyGlobal.prisma.reddit_like_users.findUnique({
    where: {
      id: session.reddit_like_user_id,
    },
  });

  if (!user) {
    throw new HttpException("User account not found", 404);
  }

  // Step 5: Validate user is a moderator and not deleted
  if (user.deleted_at !== null) {
    throw new HttpException("User account has been deleted", 403);
  }

  if (user.role !== "moderator") {
    throw new HttpException("User is not authorized as a moderator", 403);
  }

  // Step 6: Check if user is suspended from the platform
  const suspension =
    await MyGlobal.prisma.reddit_like_platform_suspensions.findFirst({
      where: {
        suspended_member_id: user.id,
        is_active: true,
        deleted_at: null,
      },
    });

  if (suspension) {
    throw new HttpException(
      "User account is currently suspended from the platform",
      403,
    );
  }

  // Step 7: Generate new access token (30-minute expiration)
  const newAccessToken = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Step 8: Calculate new access token expiration timestamp
  const accessTokenExpiresAt = toISOStringSafe(
    new Date(Date.now() + 30 * 60 * 1000),
  );
  const lastActivityAt = toISOStringSafe(new Date());

  // Step 9: Update session with new access token and activity timestamp
  await MyGlobal.prisma.reddit_like_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      access_token_expires_at: accessTokenExpiresAt,
      last_activity_at: lastActivityAt,
      updated_at: lastActivityAt,
    },
  });

  // Step 10: Return moderator profile with refreshed access token
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    email_verified: user.email_verified,
    profile_bio: user.profile_bio === null ? undefined : user.profile_bio,
    avatar_url: user.avatar_url === null ? undefined : user.avatar_url,
    token: {
      access: newAccessToken,
      refresh: body.refresh_token,
      expired_at: accessTokenExpiresAt,
      refreshable_until: toISOStringSafe(session.refresh_token_expires_at),
    },
  };
}
