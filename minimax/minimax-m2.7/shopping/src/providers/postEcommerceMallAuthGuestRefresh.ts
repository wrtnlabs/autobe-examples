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
  // 1. Look up guest session by refresh token (session UUID maps to ecommerce_mall_guest_sessions.id)
  const session =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.findUnique({
      where: {
        id: props.body.refreshToken,
      },
      select: {
        id: true,
        ecommerce_mall_guest_id: true,
        expired_at: true,
        guest: {
          select: {
            id: true,
            deleted_at: true,
          },
        },
      },
    });
  // 2. Verify session exists
  if (!session) {
    throw new HttpException("Invalid refresh token", 401);
  }
  // 3. Verify session is not expired
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Verify guest exists and is not soft-deleted
  const guest = session.guest;
  if (!guest || guest.deleted_at !== null) {
    throw new HttpException("Guest account not found or has been deleted", 403);
  }
  // 5. Generate new tokens with session continuity
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      type: "guest" as const,
      id: guest.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest" as const,
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration to extend session lifetime
  await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return authorized response
  return {
    id: guest.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
