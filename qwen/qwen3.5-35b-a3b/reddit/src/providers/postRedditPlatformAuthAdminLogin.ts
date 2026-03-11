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
  ip: string;
  body: IRedditPlatformAdmin.ILogin;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  const { email, password } = props.body;
  const admin = await MyGlobal.prisma.reddit_platform_admins.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (!admin.is_active) {
    throw new HttpException("Account suspended", 403);
  }
  const isValidPassword = await PasswordUtil.verify(
    password,
    admin.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: props.ip,
      href: "",
      referrer: "",
      access_token: "",
      refresh_token: "",
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
    },
  });
  const payload = {
    type: "admin",
    id: admin.id as string & tags.Format<"uuid">,
    session_id: session.id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
  };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "60m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    {
      ...payload,
      token_type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  await MyGlobal.prisma.reddit_platform_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: access,
      refresh_token: refresh,
    },
  });
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  const result: IRedditPlatformAdmin.IAuthorized = {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
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
  };
  return result;
}
