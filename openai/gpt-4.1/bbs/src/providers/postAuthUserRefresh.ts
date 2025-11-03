import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: IDiscussionBoardUser.IRefresh;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // 1. Verify and decode the refresh token
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: string };
  } catch (_) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  // 2. Find session and user (must exist, not expired)
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_user_id: decoded.id,
        OR: [
          { expired_at: null },
          { expired_at: { gt: toISOStringSafe(new Date()) } },
        ],
      },
      include: {
        user: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. User must not be deleted or locked
  if (session.user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (session.user.is_locked) {
    throw new HttpException("Account is locked", 403);
  }
  // 4. Generate new tokens
  const accessExpiresMs = 1 * 60 * 60 * 1000;
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const accessExpires = new Date(now.getTime() + accessExpiresMs);
  const refreshExpires = new Date(now.getTime() + refreshExpiresMs);
  const accessToken = jwt.sign(
    {
      type: "user",
      id: session.user.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: session.user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 5. Update session's expiration
  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: session.id },
    data: { expired_at: toISOStringSafe(refreshExpires) },
  });
  // 6. Return authorized user
  return {
    id: session.user.id,
    email: session.user.email,
    display_name: session.user.display_name,
    avatar_url:
      session.user.avatar_url === null ? null : session.user.avatar_url,
    is_locked: session.user.is_locked,
    deleted_at:
      session.user.deleted_at === null
        ? null
        : toISOStringSafe(session.user.deleted_at),
    created_at: toISOStringSafe(session.user.created_at),
    updated_at: toISOStringSafe(session.user.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
