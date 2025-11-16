import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: IDiscussionBoardUser.IRefreshRequest;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: string };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "user") {
    throw new HttpException("Token actor type is not user", 403);
  }

  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_user_id: decoded.id,
      },
      include: {
        user: true,
      },
    });

  if (!session) {
    throw new HttpException("Session not found or revoked", 401);
  }

  if (!session.user || !session.user.is_active || session.user.is_blocked) {
    throw new HttpException("User account is blocked or inactive", 403);
  }
  if (session.user.deleted_at !== null) {
    throw new HttpException("User account is deleted", 403);
  }

  // JWT access token expires in 1h, refresh token in 7d
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token: IDiscussionBoardAuthorizationToken = {
    access: jwt.sign(
      {
        id: session.user.id,
        session_id: session.id,
        type: "user",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        id: session.user.id,
        session_id: session.id,
        type: "user",
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: refreshExpires,
    },
  });

  return {
    id: session.user.id,
    email: session.user.email,
    is_email_verified: session.user.is_email_verified,
    is_active: session.user.is_active,
    is_blocked: session.user.is_blocked,
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    deleted_at:
      session.user.deleted_at !== null
        ? toISOStringSafe(session.user.deleted_at)
        : undefined,
    token,
  };
}
