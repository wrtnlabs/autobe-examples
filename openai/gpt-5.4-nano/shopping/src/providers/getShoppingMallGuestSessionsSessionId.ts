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
  // Deterministic lookup: admin -> member -> guest.
  const nowIso = toISOStringSafe(new Date());
  const admin = await MyGlobal.prisma.shopping_mall_admin_sessions.findUnique({
    where: { id: props.sessionId },
    select: { id: true, expired_at: true, deleted_at: true },
  });
  if (admin !== null && admin.deleted_at === null) {
    const expiredIso = toISOStringSafe(admin.expired_at);
    if (expiredIso <= nowIso) {
      throw new HttpException("Session expired", 403);
    }
    throw new HttpException("Forbidden", 403);
  }
  const member = await MyGlobal.prisma.shopping_mall_member_sessions.findUnique(
    {
      where: { id: props.sessionId },
      select: { id: true, expired_at: true },
    },
  );
  if (member !== null) {
    const expiredIso = toISOStringSafe(member.expired_at);
    if (expiredIso <= nowIso) {
      throw new HttpException("Session expired", 403);
    }
    throw new HttpException("Forbidden", 403);
  }
  const guest = await MyGlobal.prisma.shopping_mall_guest_sessions.findUnique({
    where: { id: props.sessionId },
    select: {
      id: true,
      expired_at: true,
      deleted_at: true,
      shopping_mall_guest_id: true,
    },
  });
  if (
    guest === null ||
    guest.deleted_at !== null ||
    guest.shopping_mall_guest_id !== props.guest.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const expiredIso = toISOStringSafe(guest.expired_at);
  if (expiredIso <= nowIso) {
    throw new HttpException("Session expired", 403);
  }
}
