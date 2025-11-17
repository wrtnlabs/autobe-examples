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

export async function getShoppingMallAdminShoppingMallGuestsShoppingMallGuestIdShoppingMallGuestSessionsShoppingMallGuestSessionId(props: {
  admin: AdminPayload;
  shoppingMallGuestId: string;
  shoppingMallGuestSessionId: string;
}): Promise<IShoppingMallGuestSession> {
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findFirst({
    where: {
      id: props.shoppingMallGuestSessionId,
      shopping_mall_guest_id: props.shoppingMallGuestId,
    },
  });

  if (!session) {
    throw new HttpException("Guest session not found", 404);
  }

  return {
    id: session.id,
    shopping_mall_guest_id: session.shopping_mall_guest_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : null,
  };
}
