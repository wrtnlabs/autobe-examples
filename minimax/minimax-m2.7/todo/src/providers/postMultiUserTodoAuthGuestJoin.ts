import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthGuestJoin(props: {
  ip: string;
  body: IMultiUserTodoGuest.IJoin;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  // 1. Check if guest with this device_id already exists
  const existingGuest = await MyGlobal.prisma.multi_user_todo_guests.findFirst({
    where: { device_id: props.body.device_id },
    select: {
      id: true,
      device_id: true,
      deleted_at: true,
    },
  });
  let guestId: string & tags.Format<"uuid">;
  if (existingGuest) {
    // If exists and not deleted, use existing guest
    if (existingGuest.deleted_at === null) {
      guestId = existingGuest.id;
    } else {
      // If soft-deleted, restore by clearing deleted_at
      const restored = await MyGlobal.prisma.multi_user_todo_guests.update({
        where: { id: existingGuest.id },
        data: {
          deleted_at: null,
          updated_at: new Date(),
        },
        select: {
          id: true,
        },
      });
      guestId = restored.id;
    }
  } else {
    // Create new guest record
    const newGuest = await MyGlobal.prisma.multi_user_todo_guests.create({
      data: {
        id: v4(),
        device_id: props.body.device_id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    guestId = newGuest.id;
  }
  // 2. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const now = new Date().toISOString();
  const sessionId = v4();
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 3. Create session record
  await MyGlobal.prisma.multi_user_todo_guest_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: refreshExpires,
    },
  });
  // 4. Return IAuthorized response
  const expiredAt = accessExpires.toISOString() as string &
    tags.Format<"date-time">;
  const refreshableUntil = refreshExpires.toISOString() as string &
    tags.Format<"date-time">;
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    id: guestId,
    token: token,
  };
}
