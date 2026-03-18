import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";
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

export async function patchShoppingMallGuestSessions(props: {
  guest: GuestPayload;
  body: IShoppingMallSession.IRequest;
}): Promise<IShoppingMallSession.ISummary> {
  const nowMs = Date.now();
  const sessionId =
    ("id" in (props.body as Record<string, unknown>)
      ? ((
          props.body as unknown as {
            id?: string | null;
          }
        ).id ?? null)
      : null) ?? props.guest.session_id;
  await MyGlobal.prisma.shopping_mall_guest_sessions.findUniqueOrThrow({
    where: { id: sessionId },
    select: {
      id: true,
      expired_at: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      shopping_mall_guest_id: true,
    },
  });
  const owned =
    await MyGlobal.prisma.shopping_mall_guest_sessions.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        id: true,
        expired_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        shopping_mall_guest_id: true,
      },
    });
  if (owned.shopping_mall_guest_id !== props.guest.id)
    throw new HttpException("Forbidden", 403);
  if (owned.deleted_at !== null)
    throw new HttpException("Invalid session", 400);
  if (owned.expired_at.getTime() <= nowMs)
    throw new HttpException("Invalid session", 400);
  const updated = await MyGlobal.prisma.shopping_mall_guest_sessions.update({
    where: { id: sessionId },
    data: { updated_at: new Date() },
    select: {
      id: true,
      expired_at: true,
      deleted_at: true,
      created_at: true,
      updated_at: true,
      shopping_mall_guest_id: true,
    },
  });
  return {
    id: updated.id,
    adminSession: undefined,
    memberId: undefined,
    adminId: undefined,
    expiredAt: toISOStringSafe(updated.expired_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
