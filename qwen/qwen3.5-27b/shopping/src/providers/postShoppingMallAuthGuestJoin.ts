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
  const guestId = v4() as string & tags.Format<"uuid">;
  const deviceFingerprint = `guest_${guestId}`;
  const guest = await MyGlobal.prisma.shopping_mall_guests.create({
    data: {
      id: guestId,
      device_fingerprint: deviceFingerprint,
      ip: props.body.ip ?? props.ip,
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
  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
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
        id: guest.id,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    ip: guest.ip,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
    token,
  } satisfies IShoppingMallGuest.IAuthorized;
}
