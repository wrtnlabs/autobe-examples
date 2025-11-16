import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminGuestsGuestIdGuestSessionsGuestSessionId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  guestSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallGuestSession.IUpdate;
}): Promise<IShoppingMallGuestSession> {
  const guest = await MyGlobal.prisma.shopping_mall_guests.findFirst({
    where: { id: props.guestId },
    select: { id: true },
  });

  if (guest === null) {
    throw new HttpException("Guest not found", 404);
  }

  const guestSession =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
      where: {
        id: props.guestSessionId,
        shopping_mall_guest_id: props.guestId,
      },
    });

  if (guestSession === null) {
    throw new HttpException("Guest session not found", 404);
  }

  const expiredAtValue =
    props.body.expiredTime === undefined
      ? guestSession.expired_at
      : props.body.expiredTime;

  const expiredAtForUpdate =
    expiredAtValue === undefined || expiredAtValue === null
      ? undefined
      : toISOStringSafe(expiredAtValue);

  const updated = await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: props.guestSessionId },
    data: {
      ip:
        props.body.ip === undefined
          ? guestSession.ip === null
            ? undefined
            : guestSession.ip
          : props.body.ip === null
            ? undefined
            : props.body.ip,
      href:
        props.body.href === undefined
          ? guestSession.href === null
            ? undefined
            : guestSession.href
          : props.body.href === null
            ? undefined
            : props.body.href,
      referrer:
        props.body.referrer === undefined
          ? guestSession.referrer === null
            ? undefined
            : guestSession.referrer
          : props.body.referrer === null
            ? undefined
            : props.body.referrer,
      expired_at: expiredAtForUpdate,
    },
  });

  return {
    id: updated.id,
    guest_id: updated.shopping_mall_guest_id,
    ip: updated.ip === null ? undefined : updated.ip,
    href: updated.href ?? "",
    referrer: updated.referrer ?? "",
    device_type: null,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
    is_active: false,
    last_activity_at: null,
  };
}
