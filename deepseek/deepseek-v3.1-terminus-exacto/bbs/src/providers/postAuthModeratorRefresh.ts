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
  // Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate token type matches moderator
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate session exists and is active (not expired or deleted)
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_moderator_id: decoded.id,
        deleted_at: null,
        expired_at: null,
      },
      include: {
        moderator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Validate moderator account is active
  if (session.moderator.deleted_at !== null) {
    throw new HttpException("Moderator account has been deleted", 403);
  }

  // Generate new tokens with same session ID
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update session expiration time
  await MyGlobal.prisma.discussion_board_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
      updated_at: new Date(),
    },
  });

  // Return moderator profile with new tokens
  return {
    id: session.moderator.id as string & tags.Format<"uuid">,
    email: session.moderator.email as string & tags.Format<"email">,
    username: session.moderator.username,
    display_name: session.moderator.display_name ?? undefined,
    bio: session.moderator.bio ?? undefined,
    moderation_level: session.moderator.moderation_level,
    created_at: session.moderator.created_at
      ? toISOStringSafe(session.moderator.created_at)
      : undefined,
    updated_at: session.moderator.updated_at
      ? toISOStringSafe(session.moderator.updated_at)
      : undefined,
    deleted_at: session.moderator.deleted_at
      ? toISOStringSafe(session.moderator.deleted_at)
      : undefined,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
