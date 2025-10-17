import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IRedditLikeAdmin.IRefresh;
}): Promise<IRedditLikeAdmin.IAuthorized> {
  const { body } = props;

  // Find active session with matching refresh token
  const session = await MyGlobal.prisma.reddit_like_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      deleted_at: null,
    },
  });

  if (!session) {
    throw new HttpException("Invalid refresh token. Please log in again.", 401);
  }

  // Verify refresh token has not expired
  const nowTimestamp = Date.now();
  const refreshTokenExpiryTimestamp = new Date(
    session.refresh_token_expires_at,
  ).getTime();

  if (nowTimestamp >= refreshTokenExpiryTimestamp) {
    throw new HttpException(
      "Your session has expired. Please log in again",
      401,
    );
  }

  // Get the user associated with this session
  const user = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      id: session.reddit_like_user_id,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException(
      "User account not found. Please log in again.",
      401,
    );
  }

  // Verify user is an admin
  if (user.role !== "admin") {
    throw new HttpException(
      "Access denied. Administrator privileges required.",
      403,
    );
  }

  // Generate new access token with 30-minute expiration
  const accessTokenExpiryTimestamp = nowTimestamp + 30 * 60 * 1000;

  const newAccessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      is_super_admin: user.is_super_admin,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Update session with new access token and activity timestamp
  const currentTime = toISOStringSafe(new Date(nowTimestamp));
  const newAccessTokenExpiry = toISOStringSafe(
    new Date(accessTokenExpiryTimestamp),
  );

  await MyGlobal.prisma.reddit_like_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      access_token_expires_at: newAccessTokenExpiry,
      last_activity_at: currentTime,
      updated_at: currentTime,
    },
  });

  // Return authorized response with new access token
  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    email: user.email as string & tags.Format<"email">,
    email_verified: user.email_verified,
    is_super_admin: user.is_super_admin,
    profile_bio: user.profile_bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
    token: {
      access: newAccessToken,
      refresh: session.refresh_token,
      expired_at: newAccessTokenExpiry,
      refreshable_until: toISOStringSafe(session.refresh_token_expires_at),
    },
  };
}
