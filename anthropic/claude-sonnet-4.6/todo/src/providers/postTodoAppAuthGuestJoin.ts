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
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const sessionExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  // Upsert guest by device_fingerprint (@@unique constraint) — handles concurrent duplicates atomically
  const guest = await MyGlobal.prisma.todo_app_guests.upsert({
    where: { device_fingerprint: props.body.device_fingerprint },
    create: {
      id: v4(),
      device_fingerprint: props.body.device_fingerprint,
      created_at: now,
      updated_at: now,
    },
    update: {
      updated_at: now,
    },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Create a new guest session record
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4(),
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: sessionExpires,
      guest: { connect: { id: guest.id } },
    },
    select: {
      id: true,
    },
  });
  // Generate JWT access and refresh tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    token,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
  } satisfies ITodoAppGuest.IAuthorized;
}
