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

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: IShoppingMallGuest.IJoin;
}): Promise<IShoppingMallGuest.IAuthorized> {
  const guestId = v4();
  const nowDate = new Date();

  const guestIdTyped: string & tags.Format<"uuid"> = guestId;
  const nowTyped: string & tags.Format<"date-time"> = toISOStringSafe(nowDate);

  const guest = await MyGlobal.prisma.shopping_mall_guests.create({
    data: {
      id: guestIdTyped,
      // Removed 'name' property because it does not exist in Prisma shopping_mall_guests model
      created_at: nowTyped,
      updated_at: nowTyped,
      deleted_at: null,
    },
  });

  // Calculate token expiration
  const accessExpireDateRaw = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpireDateRaw = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpireTyped: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpireDateRaw);
  const refreshExpireTyped: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpireDateRaw);

  // Resolve IP, fallback to empty string if not present because Prisma expects string not null
  const clientIp: string = props.body.ip ?? "";

  const sessionId = v4();
  const sessionIdTyped: string & tags.Format<"uuid"> = sessionId;

  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: sessionIdTyped,
      shopping_mall_guest_id: guestIdTyped,
      ip: clientIp,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowTyped,
      expired_at: accessExpireTyped,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestIdTyped,
        session_id: sessionIdTyped,
        created_at: nowTyped,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestIdTyped,
        session_id: sessionIdTyped,
        tokenType: "refresh",
        created_at: nowTyped,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpireTyped,
    refreshable_until: refreshExpireTyped,
  };

  return {
    id: guestIdTyped,
    created_at: nowTyped,
    updated_at: nowTyped,
    deleted_at: null,
    token,
  };
}
