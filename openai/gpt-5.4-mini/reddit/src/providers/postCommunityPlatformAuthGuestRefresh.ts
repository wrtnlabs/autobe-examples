import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
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

export async function postCommunityPlatformAuthGuestRefresh(props: {
  body: ICommunityPlatformGuest.IRefresh;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const guestSession =
    await MyGlobal.prisma.community_platform_guest_sessions.findFirstOrThrow({
      where: {
        guest: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        community_platform_guest_id: true,
        expired_at: true,
      },
    });
  const expiredAtMs = guestSession.expired_at.getTime();
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  const issuedAt = new Date(nowMs);
  const accessExpiredAt = new Date(accessExpiresMs);
  const refreshExpiredAt = new Date(refreshExpiresMs);
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestSession.community_platform_guest_id,
      session_id: guestSession.id,
      created_at: issuedAt.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestSession.community_platform_guest_id,
      session_id: guestSession.id,
      created_at: issuedAt.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  if (expiredAtMs < refreshExpiresMs) {
    await MyGlobal.prisma.community_platform_guest_sessions.update({
      where: {
        id: guestSession.id,
      },
      data: {
        expired_at: refreshExpiredAt,
      },
    });
  }
  return {
    id: guestSession.community_platform_guest_id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt.toISOString(),
      refreshable_until: refreshExpiredAt.toISOString(),
    },
  };
}
