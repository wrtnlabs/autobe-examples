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
  body: IRedditPlatformAdmin.IJoin;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  const existingEmail = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  const existingUsername =
    await MyGlobal.prisma.reddit_platform_admins.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  if (props.body.password.length < 8) {
    throw new HttpException("Password must be at least 8 characters", 400);
  }
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const admin = await MyGlobal.prisma.reddit_platform_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.username,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });
  const session = await MyGlobal.prisma.reddit_platform_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      access_token: "",
      refresh_token: "",
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
    },
    select: { id: true },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  await MyGlobal.prisma.reddit_platform_admin_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      session_id: session.id,
      action_type: "ADMIN_REGISTER",
      action_status: "SUCCESS",
      created_at: now,
      ip_address: props.body.ip ?? "0.0.0.0",
      referrer: props.body.referrer,
    },
  });
  return {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio ?? undefined,
    avatar_url: admin.avatar_url ?? undefined,
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token,
  } satisfies IRedditPlatformAdmin.IAuthorized;
}
