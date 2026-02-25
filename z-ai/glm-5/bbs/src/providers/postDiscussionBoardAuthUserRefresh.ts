import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthUserRefresh(props: {
  body: IDiscussionBoardUser.IRefresh;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // 1. Verify JWT signature and expiration
  let decoded: {
    sub: string;
    type: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Verify token type is 'refresh'
  if (decoded.type !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find session by refresh_token (unique index lookup)
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findUnique({
      where: { refresh_token: props.body.refresh_token },
    });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // 4. Verify session.id matches the session_id in the token
  if (session.id !== decoded.session_id) {
    throw new HttpException("Session mismatch", 403);
  }
  // 5. Verify the user in the token matches the session's user
  if (session.discussion_board_user_id !== decoded.sub) {
    throw new HttpException("Invalid token", 403);
  }
  // 6. Check if session is expired
  if (Date.now() > session.expired_at.getTime()) {
    throw new HttpException("Session expired", 401);
  }
  // 7. Find user with article and comment counts
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: session.discussion_board_user_id },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      permission_level: true,
      is_banned: true,
      deleted_at: true,
      created_at: true,
      articles: {
        select: { id: true },
        where: { deleted_at: null },
      } satisfies Prisma.discussion_board_articlesFindManyArgs,
      comments: {
        select: { id: true },
        where: { deleted_at: null },
      } satisfies Prisma.discussion_board_commentsFindManyArgs,
    },
  });
  // 8. Check if user is banned - delete session and reject
  if (user.is_banned) {
    await MyGlobal.prisma.discussion_board_user_sessions.delete({
      where: { id: session.id },
    });
    throw new HttpException("User is banned", 403);
  }
  // 9. Check if user is deleted
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 10. Generate new access token (15 minutes expiry)
  // Session ID is reused - CRITICAL for session continuity
  const accessExpiresMs = Date.now() + 15 * 60 * 1000;
  const newAccessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      email: user.email,
      permissionLevel: user.permission_level,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  // 11. Update session with new access token
  await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: session.id },
    data: { access_token: newAccessToken },
  });
  // 12. Return response with new access token and existing refresh token
  return {
    id: user.id,
    displayName: user.display_name,
    bio: user.bio ?? null,
    memberSince: user.created_at.toISOString(),
    articleCount: user.articles.length,
    commentCount: user.comments.length,
    email: user.email,
    permission_level: user.permission_level,
    token: {
      access: newAccessToken,
      refresh: session.refresh_token,
      expired_at: new Date(accessExpiresMs).toISOString(),
      refreshable_until: session.expired_at.toISOString(),
    },
  };
}
