import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function postCommunityPlatformAuthModeratorLogin(props: {
  body: ICommunityPlatformModerator.ILogin;
  ip?: string;
  href?: string;
  referrer?: string;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // Find moderator by email with password_hash
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null, // Only active, non-deleted accounts
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        is_active: true,
        permission_level: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        password_hash: true,
      },
    });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check if account is active
  if (!moderator.is_active) {
    throw new HttpException("Account is not active", 403);
  }
  // Create new session with ISO string timestamps
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: v4(),
        community_platform_moderator_id: moderator.id,
        ip: props.ip ?? "",
        href: props.href ?? "",
        referrer: props.referrer ?? "",
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  } satisfies IAuthorizationToken;
  // Update last login timestamp
  await MyGlobal.prisma.community_platform_moderators.update({
    where: { id: moderator.id },
    data: { last_login_at: now },
  });
  // Return authorized response with proper type handling
  return {
    id: moderator.id as string & tags.Format<"uuid">,
    email: moderator.email as string & tags.Format<"email">,
    username: moderator.username,
    display_name: moderator.display_name,
    bio: moderator.bio ?? null,
    avatar_url: moderator.avatar_url
      ? (moderator.avatar_url as string & tags.Format<"uri">)
      : null,
    is_active: moderator.is_active,
    permission_level: moderator.permission_level,
    last_login_at: moderator.last_login_at
      ? (moderator.last_login_at.toISOString() as string &
          tags.Format<"date-time">)
      : null,
    created_at: moderator.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: moderator.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: moderator.deleted_at
      ? (moderator.deleted_at.toISOString() as string &
          tags.Format<"date-time">)
      : null,
    token,
  } satisfies ICommunityPlatformModerator.IAuthorized;
}
