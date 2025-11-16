import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";

export async function getShoppingMallGuestsGuestIdGuestSessionsGuestSessionId(props: {
  guestId: string & tags.Format<"uuid">;
  guestSessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallGuestSession> {
  const session = await MyGlobal.prisma.shopping_mall_guest_sessions.findUnique(
    {
      where: { id: props.guestSessionId },
      select: {
        id: true,
        shopping_mall_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        // Removed is_active from select because it does not exist
      },
    },
  );

  if (!session) {
    throw new HttpException("Guest session not found", 404);
  }

  return {
    id: session.id,
    guest_id: session.shopping_mall_guest_id satisfies string as string &
      tags.Format<"uuid">,
    ip: session.ip === null ? undefined : session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    is_active: true, // Defaulted as schema does not provide this
  };
}
