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
  // 1. Check duplicate device fingerprint
  const existing = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: { device_fingerprint: props.body.device_fingerprint },
  });
  if (existing) {
    throw new HttpException("Device fingerprint already registered", 409);
  }
  // 2. Create guest account
  const guestId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: guestId,
      device_fingerprint: props.body.device_fingerprint,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 3. Create guest session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: sessionId,
      todo_app_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return IAuthorized
  const guestDto: ITodoAppGuest = {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at !== null ? toISOStringSafe(guest.deleted_at) : null,
  };
  return {
    ...guestDto,
    guest: guestDto,
    token,
  } satisfies ITodoAppGuest.IAuthorized;
}
