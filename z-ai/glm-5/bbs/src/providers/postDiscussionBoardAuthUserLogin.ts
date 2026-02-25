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

export async function postDiscussionBoardAuthUserLogin(props: {
  body: IDiscussionBoardUser.ILogin;
}): Promise<IDiscussionBoardUser.IAuthorized> {
  // 1. Find user by email with password_hash explicitly selected
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      permission_level: true,
      is_banned: true,
      created_at: true,
      password_hash: true,
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
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check if banned - retrieve ban reason
  if (user.is_banned) {
    const ban = await MyGlobal.prisma.discussion_board_bans.findFirst({
      where: { discussion_board_user_id: user.id },
      orderBy: { created_at: "desc" },
    });
    throw new HttpException(
      `Your account has been banned. Reason: ${ban?.reason ?? "No reason provided"}`,
      403,
    );
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Calculate timestamps
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 5. Generate session ID first
  const sessionId = v4();
  // 6. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Create session with actual tokens
  await MyGlobal.prisma.discussion_board_user_sessions.create({
    data: {
      id: sessionId,
      discussion_board_user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now.toISOString(),
      expired_at: accessExpires.toISOString(),
    },
  });
  // 8. Build response token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 9. Return IAuthorized
  return {
    id: user.id,
    displayName: user.display_name,
    bio: user.bio ?? null,
    memberSince: user.created_at.toISOString(),
    articleCount: user.articles.length,
    commentCount: user.comments.length,
    email: user.email,
    permission_level: user.permission_level,
    token,
  } satisfies IDiscussionBoardUser.IAuthorized;
}
