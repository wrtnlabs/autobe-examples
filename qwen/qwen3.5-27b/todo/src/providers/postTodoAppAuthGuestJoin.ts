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
  // 1. Check if guest exists by device fingerprint
  const existingGuest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: {
      device_fingerprint: props.body.deviceFingerprint,
      deleted_at: null,
    },
  });
  let guestId: string;
  if (existingGuest) {
    // 2a. Guest exists - update updated_at
    await MyGlobal.prisma.todo_app_guests.update({
      where: { id: existingGuest.id },
      data: {
        updated_at: new Date(),
      },
    });
    guestId = existingGuest.id;
  } else {
    // 2b. Guest doesn't exist - create new guest
    const newGuest = await MyGlobal.prisma.todo_app_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.deviceFingerprint,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    guestId = newGuest.id;
  }
  // 3. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4(),
      todo_app_guest_id: guestId,
      ip: props.ip,
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
        id: guestId,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Return IAuthorized response
  return {
    id: guestId,
    token,
  };
}
