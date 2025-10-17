import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdministratorRefresh(props: {
  body: IDiscussionBoardAdministrator.IRefresh;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  const { body } = props;

  // Verify and decode the refresh token
  let decoded;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate and extract admin ID from decoded token
  if (!decoded || typeof decoded !== "object" || !("adminId" in decoded)) {
    throw new HttpException("Invalid token payload", 401);
  }

  const adminId = decoded.adminId;
  if (typeof adminId !== "string") {
    throw new HttpException("Invalid token payload", 401);
  }

  // Find active sessions for this administrator
  const activeSessions =
    await MyGlobal.prisma.discussion_board_sessions.findMany({
      where: {
        discussion_board_administrator_id: adminId,
        is_active: true,
      },
      include: {
        discussion_board_refresh_tokens: true,
        administrator: true,
      },
    });

  // Find the matching refresh token by verifying each stored hash
  let matchingSession = null;
  let matchingRefreshToken = null;

  for (const session of activeSessions) {
    if (session.discussion_board_refresh_tokens) {
      const refreshTokenRecord = session.discussion_board_refresh_tokens;
      const isMatch = await PasswordUtil.verify(
        body.refresh_token,
        refreshTokenRecord.refresh_token_hash,
      );

      if (isMatch && !refreshTokenRecord.is_revoked) {
        matchingSession = session;
        matchingRefreshToken = refreshTokenRecord;
        break;
      }
    }
  }

  if (!matchingSession || !matchingRefreshToken) {
    throw new HttpException("Refresh token not found or has been revoked", 401);
  }

  // Validate refresh token expiration
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(matchingRefreshToken.expires_at) < now) {
    throw new HttpException("Refresh token has expired", 401);
  }

  // Validate administrator account
  const administrator = matchingSession.administrator;
  if (!administrator) {
    throw new HttpException("Administrator account not found", 404);
  }

  if (administrator.id !== adminId) {
    throw new HttpException("Token administrator mismatch", 403);
  }

  if (administrator.account_status !== "active") {
    throw new HttpException("Administrator account is not active", 403);
  }

  // Generate new access token with same payload structure as login/join
  const accessTokenExpiry = new Date();
  accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 30);

  const newAccessToken = jwt.sign(
    {
      adminId: administrator.id,
      username: administrator.username,
      email: administrator.email,
      type: "administrator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Generate new refresh token (token rotation for security)
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  const newRefreshToken = jwt.sign(
    {
      adminId: administrator.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Hash the new access and refresh tokens
  const newAccessTokenHash = await PasswordUtil.hash(newAccessToken);
  const newRefreshTokenHash = await PasswordUtil.hash(newRefreshToken);

  // Update session with new access token and last activity
  await MyGlobal.prisma.discussion_board_sessions.update({
    where: { id: matchingSession.id },
    data: {
      access_token_hash: newAccessTokenHash,
      last_activity_at: toISOStringSafe(new Date()),
      expires_at: toISOStringSafe(accessTokenExpiry),
    },
  });

  // Revoke old refresh token
  await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { id: matchingRefreshToken.id },
    data: {
      is_revoked: true,
      revoked_at: toISOStringSafe(new Date()),
    },
  });

  // Create new refresh token record
  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4(),
      discussion_board_session_id: matchingSession.id,
      refresh_token_hash: newRefreshTokenHash,
      expires_at: toISOStringSafe(refreshTokenExpiry),
      is_revoked: false,
      created_at: toISOStringSafe(new Date()),
      revoked_at: null,
    },
  });

  // Return the authorized response with new tokens
  return {
    id: administrator.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
