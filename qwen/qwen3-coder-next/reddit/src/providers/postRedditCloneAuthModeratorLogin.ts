import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthModeratorLogin(props: {
  body: IRedditCloneModerator.ILogin;
}): Promise<IRedditCloneModerator.IAuthorized> {
  // 1. Find moderator with password_hash explicitly
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      role_type: true,
      permissions: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      last_login_at: true,
      password_hash: true,
    },
  });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check if account is deleted (soft delete)
  if (moderator.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_moderator_sessions.create({
    data: {
      id: v4(),
      reddit_clone_moderator_id: moderator.id,
      ip: "127.0.0.1",
      href: "/redditClone/auth/moderator/login",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 4. Update last login timestamp
  await MyGlobal.prisma.reddit_clone_moderators.update({
    where: { id: moderator.id },
    data: {
      last_login_at: toISOStringSafe(now),
    },
  });
  // 5. Generate JWT tokens
  const nowISOString = toISOStringSafe(now);
  const tokenPayload = {
    type: "moderator",
    id: moderator.id,
    session_id: session.id,
    created_at: nowISOString,
  };
  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "15m",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh",
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
  // 6. Return IAuthorized response
  return {
    id: moderator.id,
    email: moderator.email,
    username: moderator.username,
    display_name: moderator.display_name,
    bio: moderator.bio,
    avatar_url: moderator.avatar_url
      ? (moderator.avatar_url as string & tags.Format<"uri">)
      : undefined,
    role_type: moderator.role_type,
    permissions: moderator.permissions,
    created_at: toISOStringSafe(moderator.created_at),
    access_token: token.access,
    refresh_token: token.refresh,
    token_expires_in: 900,
    token,
  } satisfies IRedditCloneModerator.IAuthorized;
}
