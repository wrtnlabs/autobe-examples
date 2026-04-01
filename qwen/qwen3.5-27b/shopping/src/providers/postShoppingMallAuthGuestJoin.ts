import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthGuestJoin(props: {
  ip: string;
  body: IShoppingMallGuest.IJoin;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const now = new Date();
  const nowIso = now.toISOString();
  const guestId = v4();
  const deviceFingerprint = v4();
  const guestIp = props.body.ip ?? props.ip;
  const guest = await MyGlobal.prisma.shopping_mall_guests.create({
    data: {
      id: guestId,
      device_fingerprint: deviceFingerprint,
      ip: guestIp,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      device_fingerprint: true,
      ip: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const accessExpires = new Date(now.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const accessExpiresIso = accessExpires.toISOString();
  const refreshExpiresIso = refreshExpires.toISOString();
  const sessionId = v4();
  await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_guest_id: guestId,
      ip: guestIp,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    ip: guest.ip,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
    deleted_at: guest.deleted_at?.toISOString() ?? null,
    token: token,
  };
}
