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
  body: ITodoAppGuest.IJoin;
}): Promise<ITodoAppGuest.IAuthorized> {
  // 1. Check for duplicate device_fingerprint
  const existing = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: { device_fingerprint: props.body.device_fingerprint },
  });
  if (existing) {
    throw new HttpException("Device fingerprint already registered", 409);
  }
  // 2. Create guest record
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const guestId = v4() as string & tags.Format<"uuid">;
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: guestId,
      device_fingerprint: props.body.device_fingerprint,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // 3. Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: sessionId,
      todo_app_guest_id: guest.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
    select: {
      id: true,
    },
  });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return authorized response
  return {
    id: guest.id,
    token,
  } satisfies ITodoAppGuest.IAuthorized;
}
