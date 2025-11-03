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

  // Step 1: Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  };

  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
      created_at: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Step 2: Validate token type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type for moderator endpoint", 403);
  }

  // Step 3: Validate session exists and is active
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_moderator_id: decoded.id,
      },
      include: {
        moderator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Step 4: Validate moderator account
  const moderator = session.moderator;

  if (moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  if (moderator.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  if (!moderator.email_verified) {
    throw new HttpException("Email not verified", 403);
  }

  // Step 5: Generate new tokens with SAME session_id
  const nowIso = toISOStringSafe(new Date());
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshExpiresIso = toISOStringSafe(refreshExpiresDate);

  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const newRefreshToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Update session expiration time
  await MyGlobal.prisma.discussion_board_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpiresDate,
    },
  });

  // Step 7: Return authorized moderator with new tokens
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
    last_login_at: moderator.last_login_at
      ? toISOStringSafe(moderator.last_login_at)
      : undefined,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
