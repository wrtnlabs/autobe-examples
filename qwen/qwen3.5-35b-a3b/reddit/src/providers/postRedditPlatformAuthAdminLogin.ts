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

export async function postRedditPlatformAuthAdminLogin(props: {
  body: IRedditPlatformAdmin.ILogin;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const admin = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: { email: props.body.email },
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
      password_hash: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (!admin.is_active) {
    throw new HttpException("Account is not active", 403);
  }
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.reddit_platform_admin_sessions.create({
    data: {
      id: sessionId,
      admin: { connect: { id: admin.id } },
      ip: "",
      href: "",
      referrer: "",
      access_token: "",
      refresh_token: "",
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  const adminData: IRedditPlatformAdmin = {
    id: admin.id,
    email: admin.email,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio ?? undefined,
    avatar_url: admin.avatar_url ?? undefined,
    is_active: admin.is_active,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
  } satisfies IRedditPlatformAdmin;
  return {
    ...adminData,
    token,
  } satisfies IRedditPlatformAdmin.IAuthorized;
}
