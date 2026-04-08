import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        shopping_mall_guest_id: props.guest.id,
        expired_at: { gt: new Date() },
      },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        guest: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_guestsFindManyArgs,
      },
    });
  return {
    id: session.id,
    actorType: "admin",
    actorId: session.guest.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: session.created_at.toISOString(),
    expired_at: session.expired_at.toISOString(),
  } satisfies IShoppingMallAdminSession;
}
