import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IShoppingMallGuest.IRefresh;
}): Promise<IShoppingMallGuest.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_guest_id: decoded.id,
      expired_at: null,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const guest = await MyGlobal.prisma.shopping_mall_guests.findUnique({
    where: { id: decoded.id },
  });

  if (!guest) {
    throw new HttpException("Guest not found", 403);
  }

  const now = new Date();
  const accessExpiresTimestamp = now.getTime() + 60 * 60 * 1000;
  const refreshExpiresTimestamp = now.getTime() + 7 * 24 * 60 * 60 * 1000;

  const accessExpiresString = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpiresString = toISOStringSafe(
    new Date(refreshExpiresTimestamp),
  );

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresString,
    refreshable_until: refreshExpiresString,
  };

  await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpiresTimestamp) },
  });

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    token,
  };
}
