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

  // Step 1: Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
  };
  try {
    decoded = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "member";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate type matches expected actor type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }

  // Step 3: Validate session exists and is active
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_member_id: decoded.id,
      },
      include: {
        member: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Validate member account status
  if (session.member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  if (!session.member.email_verified) {
    throw new HttpException("Email not verified", 403);
  }

  if (session.member.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Step 5: Generate new access and refresh tokens with SAME session_id
  const now = toISOStringSafe(new Date());
  const accessExpiresTime = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires = toISOStringSafe(accessExpiresTime);
  const refreshExpires = toISOStringSafe(refreshExpiresTime);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Update session expiration time
  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpiresTime,
    },
  });

  // Step 7: Return member data with new tokens
  return {
    id: session.member.id,
    username: session.member.username,
    email: session.member.email,
    display_name:
      session.member.display_name !== null
        ? session.member.display_name
        : undefined,
    bio: session.member.bio !== null ? session.member.bio : undefined,
    location:
      session.member.location !== null ? session.member.location : undefined,
    website_url:
      session.member.website_url !== null
        ? session.member.website_url
        : undefined,
    profile_picture_url:
      session.member.profile_picture_url !== null
        ? session.member.profile_picture_url
        : undefined,
    email_verified: session.member.email_verified,
    status: session.member.status,
    profile_visibility: session.member.profile_visibility,
    activity_visibility: session.member.activity_visibility,
    last_login_at:
      session.member.last_login_at !== null
        ? toISOStringSafe(session.member.last_login_at)
        : undefined,
    created_at: toISOStringSafe(session.member.created_at),
    updated_at: toISOStringSafe(session.member.updated_at),
    deleted_at:
      session.member.deleted_at !== null
        ? toISOStringSafe(session.member.deleted_at)
        : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
