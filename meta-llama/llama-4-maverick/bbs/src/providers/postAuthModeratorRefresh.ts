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
  let decoded: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  try {
    decoded = jwt.verify(props.body, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        moderator_id: decoded.id,
      },
      include: {
        moderator: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  } else if (session.moderator_id === null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = Date.now();
  const accessExpires = now + 60 * 60 * 1000;
  const refreshExpires = now + 7 * 24 * 60 * 60 * 1000;
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date(now)),
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
        created_at: toISOStringSafe(new Date(now)),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(new Date(accessExpires)),
    refreshable_until: toISOStringSafe(new Date(refreshExpires)),
  };
  await MyGlobal.prisma.discussion_board_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: toISOStringSafe(new Date(refreshExpires)),
    },
  });
  return {
    id: decoded.id,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
