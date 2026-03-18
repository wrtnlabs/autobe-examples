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
  if (!props.body.refreshToken) {
    throw new HttpException("Invalid request payload", 400);
  }
  const verified = (() => {
    try {
      return jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
  })();
  if (typeof verified !== "object" || verified === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const payload = verified as unknown as Record<string, unknown>;
  const tokenType = payload.type;
  const tokenGuestId = payload.id;
  const tokenSessionId = payload.session_id;
  if (tokenType !== "guest") {
    throw new HttpException("Forbidden", 403);
  }
  if (typeof tokenGuestId !== "string" || typeof tokenSessionId !== "string") {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.findFirst({
      where: {
        id: tokenSessionId,
        community_platform_guest_id: tokenGuestId,
        deleted_at: null,
        expired_at: { gt: new Date() },
      },
      select: {
        id: true,
        community_platform_guest_id: true,
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest =
    await MyGlobal.prisma.community_platform_guests.findUniqueOrThrow({
      where: { id: tokenGuestId },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        device_fingerprint: true,
      },
    });
  const accessExpiredAt = new Date(Date.now() + 60 * 60 * 1000);
  const refreshableUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const issuedAtIso = toISOStringSafe(new Date());
  const expiredAtIso = toISOStringSafe(accessExpiredAt);
  const refreshableUntilIso = toISOStringSafe(refreshableUntil);
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: issuedAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: issuedAtIso,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.community_platform_guest_sessions.update({
        where: { id: session.id },
        data: {
          expired_at: refreshableUntil,
        },
      });
    });
  } catch {
    throw new HttpException("Internal Server Error", 500);
  }
  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    device_fingerprint: guest.device_fingerprint,
    access_token: accessToken,
    refresh_token: refreshToken,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAtIso,
      refreshable_until: refreshableUntilIso,
    },
  };
}
