import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function postShoppingMallShoppingMallGuestsShoppingMallGuestIdShoppingMallGuestSessions(props: {
  shoppingMallGuestId: string & tags.Format<"uuid">;
  body: IShoppingMallGuestSession.ICreate;
}): Promise<IShoppingMallGuestSession> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_guest_sessions.create({
    data: {
      id: v4(),
      shopping_mall_guest_id: props.shoppingMallGuestId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: props.body.expired_at ?? null,
    },
  });

  return {
    id: created.id,
    shopping_mall_guest_id: created.shopping_mall_guest_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
