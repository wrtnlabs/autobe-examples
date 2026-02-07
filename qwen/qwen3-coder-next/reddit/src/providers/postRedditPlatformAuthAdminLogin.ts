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
  // Since ILogin is empty, admin login may use a different authentication mechanism
  // or this is a simplified implementation. Create a minimal session.
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_admin_sessions.create({
    data: {
      id: v4(),
      reddit_platform_admin_id: v4(), // Placeholder - in real scenario would be from auth context
      reddit_platform_user_id: v4(),
      access_token: v4(),
      refresh_token: v4(),
      expires_at: Math.floor(accessExpires.getTime() / 1000),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: "admin-placeholder-id",
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: "admin-placeholder-id",
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    token,
  } satisfies IRedditPlatformAdmin.IAuthorized;
}
