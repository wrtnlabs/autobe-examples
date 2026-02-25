import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function postCommunityPlatformAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  type DecodedPayload = {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
    tokenType?: string;
    created_at?: string & tags.Format<"date-time">;
  };
  let decoded: DecodedPayload;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as DecodedPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        admin_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = Date.now();
  const accessTokenExpiredAtMillis = now + 3600000; // 1 hour
  const refreshTokenExpiredAtMillis = now + 7 * 24 * 3600000; // 7 days
  const accessExpiredAt = toISOStringSafe(
    new Date(accessTokenExpiredAtMillis),
  ) as string & tags.Format<"date-time">;
  const refreshExpiredAt = toISOStringSafe(
    new Date(refreshTokenExpiredAtMillis),
  ) as string & tags.Format<"date-time">;
  const nowISOString = toISOStringSafe(new Date(now)) as string &
    tags.Format<"date-time">;
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.community_platform_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiredAt },
  });
  return {
    id: admin.id,
    email: admin.email,
    displayName: admin.display_name,
    bio: admin.bio ?? null,
    avatarUrl: admin.avatar_url ?? null,
    createdAt: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      admin.deleted_at === null
        ? null
        : (toISOStringSafe(admin.deleted_at) as string &
            tags.Format<"date-time">),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
