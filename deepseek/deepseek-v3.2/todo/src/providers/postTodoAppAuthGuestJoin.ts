import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthGuestJoin(props: {
  ip: string;
  body: ITodoAppGuest.IJoin;
}): Promise<ITodoAppGuest.IAuthorized> {
  // Check for existing guest with same device fingerprint
  const existingGuest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: {
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const guestId = existingGuest ? existingGuest.id : v4();
  const now = new Date();
  // Create or update guest record
  const guest = existingGuest
    ? await MyGlobal.prisma.todo_app_guests.update({
        where: { id: existingGuest.id },
        data: { updated_at: now },
        select: {
          id: true,
          device_fingerprint: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      })
    : await MyGlobal.prisma.todo_app_guests.create({
        data: {
          id: guestId,
          device_fingerprint: props.body.device_fingerprint,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: {
          id: true,
          device_fingerprint: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
  // Create guest session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4(),
      guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: accessExpires,
      created_at: now,
    },
    select: {
      id: true,
      guest_id: true,
      ip: true,
      href: true,
      referrer: true,
      expired_at: true,
      created_at: true,
    },
  });
  // Generate JWT tokens with proper GuestPayload structure
  const guestPayload = {
    type: "guest" as const,
    id: guest.id,
    session_id: session.id,
  };
  const token = {
    access: jwt.sign(guestPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...guestPayload, tokenType: "refresh" as const },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Construct response with proper type resolution
  const response: ITodoAppGuest.IAuthorized = {
    id: typia.assert<string & tags.Format<"uuid">>(guest.id),
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token,
  };
  return response;
}
