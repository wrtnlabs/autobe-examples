import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: IPoliticalForumModerator.IRefresh;
}): Promise<IPoliticalForumModerator.IAuthorized> {
  // 1. Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Validate type matches expected actor type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }

  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.political_forum_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        political_forum_moderator_id: decoded.id,
      },
      include: {
        moderator: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  } else if (session.moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // 4. Generate new access and refresh tokens with same session_id
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
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
        type: decoded.type,
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
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 5. Update session expiration
  await MyGlobal.prisma.political_forum_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // 6. Return new tokens with moderator identity
  return {
    id: decoded.id,
    email: session.moderator.email,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
