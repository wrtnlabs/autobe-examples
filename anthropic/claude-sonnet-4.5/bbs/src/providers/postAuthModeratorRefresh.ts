import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: IDiscussionBoardModerator.IRefresh;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  let decodedToken: { userId: string; sessionId: string; tokenType: string };
  try {
    const decoded = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );

    if (typeof decoded === "string") {
      throw new HttpException("Invalid token format", 401);
    }

    decodedToken = decoded as {
      userId: string;
      sessionId: string;
      tokenType: string;
    };

    if (decodedToken.tokenType !== "refresh") {
      throw new HttpException("Invalid token type", 401);
    }
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const session = await MyGlobal.prisma.discussion_board_sessions.findUnique({
    where: { id: decodedToken.sessionId },
    include: {
      moderator: true,
      discussion_board_refresh_tokens: true,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 401);
  }

  if (!session.is_active || session.revoked_at !== null) {
    throw new HttpException("Session is no longer active", 401);
  }

  if (!session.moderator) {
    throw new HttpException("Moderator account not found", 401);
  }

  const moderator = session.moderator;

  if (moderator.account_status !== "active" || !moderator.is_active) {
    throw new HttpException("Moderator account is not active", 403);
  }

  if (!moderator.email_verified) {
    throw new HttpException("Email verification required", 403);
  }

  const refreshTokenRecord = session.discussion_board_refresh_tokens;

  if (!refreshTokenRecord) {
    throw new HttpException("Refresh token not found", 401);
  }

  if (refreshTokenRecord.is_revoked) {
    throw new HttpException("Refresh token has been revoked", 401);
  }

  const now = new Date();
  if (refreshTokenRecord.expires_at < now) {
    throw new HttpException("Refresh token has expired", 401);
  }

  const accessTokenExpiration = new Date(now.getTime() + 30 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      userId: moderator.id,
      username: moderator.username,
      email: moderator.email,
      role: "moderator",
      sessionId: session.id,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshTokenExpiration = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const newRefreshToken = jwt.sign(
    {
      userId: moderator.id,
      tokenType: "refresh",
      sessionId: session.id,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const newAccessTokenHash = await PasswordUtil.hash(newAccessToken);

  await MyGlobal.prisma.discussion_board_sessions.update({
    where: { id: session.id },
    data: {
      access_token_hash: newAccessTokenHash,
      last_activity_at: toISOStringSafe(now),
      expires_at: toISOStringSafe(accessTokenExpiration),
    },
  });

  await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { id: refreshTokenRecord.id },
    data: {
      is_revoked: true,
      revoked_at: toISOStringSafe(now),
    },
  });

  const newRefreshTokenHash = await PasswordUtil.hash(newRefreshToken);

  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_session_id: session.id,
      refresh_token_hash: newRefreshTokenHash,
      expires_at: toISOStringSafe(refreshTokenExpiration),
      is_revoked: false,
      created_at: toISOStringSafe(now),
    },
  });

  await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: moderator.id },
    data: {
      last_activity_at: toISOStringSafe(now),
    },
  });

  return {
    id: moderator.id as string & tags.Format<"uuid">,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessTokenExpiration),
      refreshable_until: toISOStringSafe(refreshTokenExpiration),
    },
  };
}
