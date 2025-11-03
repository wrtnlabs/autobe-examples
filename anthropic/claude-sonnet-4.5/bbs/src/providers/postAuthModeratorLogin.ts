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

export async function postAuthModeratorLogin(props: {
  body: IDiscussionBoardModerator.ILogin;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  // Phase 1: Find moderator by username or email
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        OR: [
          { username: body.username_or_email },
          { email: body.username_or_email },
        ],
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Invalid username/email or password", 401);
  }

  // Phase 2: Verify password using PasswordUtil
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    moderator.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid username/email or password", 401);
  }

  // Phase 3: Validate account status
  if (!moderator.email_verified) {
    throw new HttpException(
      "Please verify your email address before logging in",
      403,
    );
  }

  if (moderator.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Phase 4: Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const sessionId = v4();

  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: sessionId,
        discussion_board_moderator_id: moderator.id,
        ip: body.ip ?? "unknown",
        href: body.href,
        referrer: body.referrer,
        created_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // Phase 5: Update last_login_at
  await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: moderator.id },
    data: {
      last_login_at: toISOStringSafe(now),
    },
  });

  // Phase 6: Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Phase 7: Return authorized response
  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    display_name: moderator.display_name ?? undefined,
    bio: moderator.bio ?? undefined,
    location: moderator.location ?? undefined,
    website_url: moderator.website_url ?? undefined,
    profile_picture_url: moderator.profile_picture_url ?? undefined,
    email_verified: moderator.email_verified,
    status: moderator.status,
    moderation_permissions: moderator.moderation_permissions,
    profile_visibility: moderator.profile_visibility,
    activity_visibility: moderator.activity_visibility,
    last_login_at: toISOStringSafe(now),
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
