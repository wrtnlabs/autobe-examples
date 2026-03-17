import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
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

export async function postEcommerceMallAuthGuestRefresh(props: {
  body: IEcommerceMallGuest.IRefresh;
}): Promise<IEcommerceMallGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        ecommerce_mall_guest_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session not expired using timestamp comparison
  const now = Date.now();
  if (session.expired_at.getTime() <= now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate guest not deleted
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 6. Generate new tokens (same session_id)
  const accessExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  const refreshExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpires) },
  });
  // 8. Get guest sessions and count
  const sessionsData =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany({
      where: { ecommerce_mall_guest_id: guest.id },
      select: {
        id: true,
        ecommerceMallGuest: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const sessionCount =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.count({
      where: { ecommerce_mall_guest_id: guest.id },
    });
  // 9. Return authorized response
  return {
    id: guest.id,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt:
      guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
    sessions: sessionsData.map((s) => ({
      id: s.id,
      ecommerceMallGuest: {
        id: s.ecommerceMallGuest.id,
        createdAt: toISOStringSafe(s.ecommerceMallGuest.created_at),
        updatedAt: toISOStringSafe(s.ecommerceMallGuest.updated_at),
        deletedAt:
          s.ecommerceMallGuest.deleted_at === null
            ? null
            : toISOStringSafe(s.ecommerceMallGuest.deleted_at),
        sessionCount,
      },
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      created_at: toISOStringSafe(s.created_at),
      expired_at: toISOStringSafe(s.expired_at),
    })),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpires)),
      refreshable_until: toISOStringSafe(new Date(refreshExpires)),
    },
  };
}
