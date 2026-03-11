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

export async function postRedditPlatformAuthAdminRefresh(props: {
  body: IRedditPlatformAdmin.IRefresh;
}): Promise<IRedditPlatformAdmin.IAuthorized> {
  // 1. Verify refresh token JWT
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  // 2. Validate session exists and is active
  const session =
    await MyGlobal.prisma.reddit_platform_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        admin_id: decoded.id,
        deleted_at: null,
        expired_at: {
          gt: new Date(),
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate admin account exists and is active
  const admin = await MyGlobal.prisma.reddit_platform_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (!admin.is_active) {
    throw new HttpException("Admin account is suspended", 403);
  }
  // 4. Calculate new expiration times
  const accessExpiresTime = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpiresTime);
  const refreshExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpiresTime);
  // 5. Generate new tokens (same session_id)
  const access = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens and extended expiration
  await MyGlobal.prisma.reddit_platform_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: access,
      refresh_token: refresh,
      expired_at: refreshExpiresTime,
      updated_at: new Date(),
    },
  });
  // 7. Build response
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  const email: string & tags.Format<"email"> = admin.email;
  const id: string & tags.Format<"uuid"> = admin.id;
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    admin.created_at,
  );
  const updated_at: string & tags.Format<"date-time"> = toISOStringSafe(
    admin.updated_at,
  );
  return {
    id,
    email,
    username: admin.username,
    display_name: admin.display_name,
    bio: admin.bio ?? "",
    avatar_url: admin.avatar_url ?? "",
    is_active: admin.is_active,
    created_at,
    updated_at,
    token,
  };
}
