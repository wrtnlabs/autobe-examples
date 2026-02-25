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

export async function postCommunityPlatformAuthModeratorJoin(props: {
  body: ICommunityPlatformModerator.IJoin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // Check for existing moderator with same email or username
  const existing =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("Email or username already registered", 409);
  }
  // Create moderator record with correct field names
  const moderator = await MyGlobal.prisma.community_platform_moderators.create({
    data: {
      id: v4(),
      email: props.body.email,
      username: props.body.username,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name ?? props.body.username,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatar_url ?? null,
      is_active: true,
      permission_level: "moderator",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
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
    },
  });
  // Create session record with correct field names
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.create({
      data: {
        id: v4(),
        community_platform_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: accessExpires,
        created_at: new Date(),
      },
      select: {
        id: true,
        community_platform_moderator_id: true,
        ip: true,
        href: true,
        referrer: true,
        expired_at: true,
        created_at: true,
      },
    });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Transform moderator data to response format
  return {
    id: moderator.id,
    email: moderator.email,
    username: moderator.username,
    display_name: moderator.display_name,
    bio: moderator.bio,
    avatar_url: moderator.avatar_url,
    is_active: moderator.is_active,
    permission_level: moderator.permission_level,
    last_login_at: moderator.last_login_at
      ? toISOStringSafe(moderator.last_login_at)
      : null,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token: token,
  } satisfies ICommunityPlatformModerator.IAuthorized;
}
