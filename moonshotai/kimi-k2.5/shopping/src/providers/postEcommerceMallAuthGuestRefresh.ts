import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
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
  // Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session exists and belongs to the guest
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
  // Check if session is expired
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  // Validate guest exists and not deleted
  const guest = await MyGlobal.prisma.ecommerce_mall_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // Calculate token expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Generate new tokens with same session_id
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with new context and expiration
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      href: props.body.href,
      referrer: props.body.referrer,
      ip: props.body.ip ?? session.ip,
      expired_at: refreshExpires,
    },
  });
  // Return refreshed authorization
  return {
    id: guest.id,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
