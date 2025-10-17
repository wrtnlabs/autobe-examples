import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberRefresh(props: {
  body: IDiscussionBoardMember.IRefresh;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  let decoded: any;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const allRefreshTokens =
    await MyGlobal.prisma.discussion_board_refresh_tokens.findMany({
      where: {
        is_revoked: false,
      },
      include: {
        session: {
          include: {
            member: true,
          },
        },
      },
    });

  let refreshTokenRecord = null;
  for (const tokenRecord of allRefreshTokens) {
    const isMatch = await PasswordUtil.verify(
      body.refresh_token,
      tokenRecord.refresh_token_hash,
    );
    if (isMatch) {
      refreshTokenRecord = tokenRecord;
      break;
    }
  }

  if (!refreshTokenRecord) {
    throw new HttpException("Refresh token not found or has been revoked", 401);
  }

  const now = new Date();
  if (new Date(refreshTokenRecord.expires_at) < now) {
    throw new HttpException("Refresh token has expired", 401);
  }

  if (!refreshTokenRecord.session.is_active) {
    throw new HttpException("Session is no longer active", 401);
  }

  const member = refreshTokenRecord.session.member;
  if (!member) {
    throw new HttpException("Member account not found", 404);
  }

  if (member.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  if (!member.email_verified) {
    throw new HttpException("Email not verified", 403);
  }

  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessTokenExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      userId: member.id,
      username: member.username,
      email: member.email,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshTokenExpiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const newRefreshToken = jwt.sign(
    {
      userId: member.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const newRefreshTokenHash = await PasswordUtil.hash(newRefreshToken);
  const newAccessTokenHash = await PasswordUtil.hash(newAccessToken);

  await MyGlobal.prisma.discussion_board_refresh_tokens.update({
    where: { id: refreshTokenRecord.id },
    data: {
      is_revoked: true,
      revoked_at: toISOStringSafe(now),
    },
  });

  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4(),
      discussion_board_session_id:
        refreshTokenRecord.discussion_board_session_id,
      refresh_token_hash: newRefreshTokenHash,
      expires_at: toISOStringSafe(refreshTokenExpiresAt),
      is_revoked: false,
      created_at: toISOStringSafe(now),
    },
  });

  await MyGlobal.prisma.discussion_board_sessions.update({
    where: { id: refreshTokenRecord.discussion_board_session_id },
    data: {
      access_token_hash: newAccessTokenHash,
      expires_at: toISOStringSafe(accessTokenExpiresAt),
      last_activity_at: toISOStringSafe(now),
    },
  });

  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: member.id },
    data: {
      last_activity_at: toISOStringSafe(now),
    },
  });

  return {
    id: member.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessTokenExpiresAt),
      refreshable_until: toISOStringSafe(refreshTokenExpiresAt),
    },
  };
}
