import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
}): Promise<void> {
  const nowMs = Date.now();
  const adminSession =
    await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });
  if (adminSession !== null && adminSession.deleted_at === null) {
    const expiredAt = adminSession.expired_at;
    const expiredMs = expiredAt.getTime();
    if (expiredMs > nowMs) {
      throw new HttpException("Forbidden", 403);
    }
    throw new HttpException("Unauthorized", 401);
  }
  const memberSession =
    await MyGlobal.prisma.shopping_mall_member_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });
  if (memberSession !== null) {
    const expiredAt = memberSession.expired_at;
    const expiredMs = expiredAt.getTime();
    if (expiredMs > nowMs) {
      throw new HttpException("Forbidden", 403);
    }
    throw new HttpException("Unauthorized", 401);
  }
  const guestSession =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });
  if (guestSession === null || guestSession.deleted_at !== null) {
    throw new HttpException("Unauthorized", 401);
  }
  const expiredAt = guestSession.expired_at;
  const expiredMs = expiredAt.getTime();
  if (expiredMs <= nowMs) {
    throw new HttpException("Unauthorized", 401);
  }
  if (guestSession.shopping_mall_guest_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
}
