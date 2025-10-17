import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(props: {
  body: IRedditLikeGuest.IRefresh;
}): Promise<IRedditLikeGuest.IAuthorized> {
  const { body } = props;

  // Step 1: Verify and decode the refresh token
  let decoded: { id: string; type: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; type: string };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Find the active session by refresh token
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
  const currentTime = new Date();
  const refreshExpiresAt = new Date(session.refresh_token_expires_at);
  if (refreshExpiresAt <= currentTime) {
    throw new HttpException("Refresh token has expired", 401);
  }

  // Step 4: Find the guest user
  const user = await MyGlobal.prisma.reddit_like_users.findUnique({
    where: { id: session.reddit_like_user_id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Step 5: Validate user is a guest
  if (user.role !== "guest") {
    throw new HttpException("Unauthorized: Not a guest account", 403);
  }

  // Step 6: Validate session_identifier exists
  if (!user.session_identifier) {
    throw new HttpException("Invalid guest session state", 500);
  }

  // Step 7: Generate new access token with same payload structure
  const accessTokenExpiresAt = new Date(currentTime.getTime() + 30 * 60 * 1000);
  const refreshTokenExpiresAt = new Date(
    currentTime.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const newAccessToken = jwt.sign(
    {
      id: user.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Step 8: Generate new refresh token (token rotation for security)
  const newRefreshToken = jwt.sign(
    {
      id: user.id,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Step 9: Update session with new tokens and activity timestamp
  await MyGlobal.prisma.reddit_like_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      access_token_expires_at: toISOStringSafe(accessTokenExpiresAt),
      refresh_token_expires_at: toISOStringSafe(refreshTokenExpiresAt),
      last_activity_at: toISOStringSafe(currentTime),
      updated_at: toISOStringSafe(currentTime),
    },
  });

  // Step 10: Update user's last visit timestamp
  const updatedUser = await MyGlobal.prisma.reddit_like_users.update({
    where: { id: user.id },
    data: {
      last_visit_at: toISOStringSafe(currentTime),
      updated_at: toISOStringSafe(currentTime),
    },
  });

  // Step 11: Return authorized response
  return {
    id: updatedUser.id,
    session_identifier: user.session_identifier,
    role: "guest",
    first_visit_at: updatedUser.first_visit_at
      ? toISOStringSafe(updatedUser.first_visit_at)
      : toISOStringSafe(currentTime),
    last_visit_at: updatedUser.last_visit_at
      ? toISOStringSafe(updatedUser.last_visit_at)
      : toISOStringSafe(currentTime),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessTokenExpiresAt),
      refreshable_until: toISOStringSafe(refreshTokenExpiresAt),
    },
  };
}
