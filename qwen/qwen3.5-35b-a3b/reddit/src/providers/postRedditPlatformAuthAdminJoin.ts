import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthAdminJoin(props: {
  ip: string;
  body: IRedditPlatformAdmin.IJoin;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check duplicate username
  const existingUsername =
    await MyGlobal.prisma.reddit_platform_admins.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Create admin record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  const admin = await MyGlobal.prisma.reddit_platform_admins.create({
    data: {
      id: v4() as any as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.display_name ?? "",
      bio: props.body.bio ?? "",
      avatar_url: props.body.avatar_url ?? "",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });
  // 4. Create session with token expiration
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const session = await MyGlobal.prisma.reddit_platform_admin_sessions.create({
    data: {
      id: v4() as any as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href ?? "",
      referrer: props.body.referrer ?? "",
      access_token: "",
      refresh_token: "",
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
      deleted_at: null,
    },
  });
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "admin" as const,
    id: admin.id,
    session_id: session.id,
    created_at: now,
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh" as const,
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
  // 6. Update session with actual tokens
  await MyGlobal.prisma.reddit_platform_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  // 7. Return admin with token
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio ?? "",
    avatar_url: admin.avatar_url ?? "",
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    token,
  } satisfies IRedditPlatformAdmin.IAuthorized;
}
