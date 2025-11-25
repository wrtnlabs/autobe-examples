import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function putShoppingMallShoppingMallGuestsShoppingMallGuestIdShoppingMallGuestSessionsShoppingMallGuestSessionId(props: {
  shoppingMallGuestId: string & tags.Format<"uuid">;
  shoppingMallGuestSessionId: string & tags.Format<"uuid">;
  body: IShoppingMallGuestSession.IUpdate;
}): Promise<IShoppingMallGuestSession> {
  const existing =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findUnique({
      where: { id: props.shoppingMallGuestSessionId },
    });

  if (!existing) {
    throw new HttpException("Shopping mall guest session not found", 404);
  }

  if (existing.shopping_mall_guest_id !== props.shoppingMallGuestId) {
    throw new HttpException(
      "Forbidden to update session of another guest",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: props.shoppingMallGuestSessionId },
    data: {
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: props.body.expired_at ?? null,
    },
  });

  return {
    id: updated.id,
    shopping_mall_guest_id: updated.shopping_mall_guest_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
  };
}
