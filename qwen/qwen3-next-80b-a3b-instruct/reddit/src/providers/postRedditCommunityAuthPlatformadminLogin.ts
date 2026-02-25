import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthPlatformAdminLogin(props: {
  ip: string;
  body: IRedditCommunityPlatformAdmin.ILogin;
}): Promise<IRedditCommunityPlatformAdmin.IAuthorized> {
  // 1. Query platform admin by email with password_hash
  const admin =
    await MyGlobal.prisma.reddit_community_platform_admins.findFirst({
      where: {
        email: props.body.email,
        is_deleted: false,
      },
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        email: true,
        is_deleted: true,
        password_hash: true,
      },
    });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session with ISO date-time strings
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  // Cast body to extend ILogin with optional href and referrer
  const extendedBody = props.body as IRedditCommunityPlatformAdmin.ILogin & {
    href?: string;
    referrer?: string;
  };
  const session =
    await MyGlobal.prisma.reddit_community_platform_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        platform_admin_id: admin.id,
        ip: props.ip ?? "",
        href: extendedBody.href ?? "",
        referrer: extendedBody.referrer ?? "",
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // 4. Generate JWT tokens with ISO date-time strings
  const token = {
    access: jwt.sign(
      {
        type: "platformadmin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "platformadmin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  } satisfies IAuthorizationToken;
  // 5. Return IAuthorized
  return {
    id: admin.id,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio,
    avatar_url: admin.avatar_url,
    karma_score: admin.karma_score,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    email: admin.email,
    is_deleted: admin.is_deleted,
    access: token.access,
    refresh: token.refresh,
    token,
  } satisfies IRedditCommunityPlatformAdmin.IAuthorized;
}
