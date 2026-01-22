import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: ITodoListGuest.IRefresh;
}): Promise<ITodoListGuest.IAuthorized> {
  // Verify session exists and is active
  const guestSession = await MyGlobal.prisma.todo_list_guest_sessions.findFirst(
    {
      where: {
        id: props.guest.session_id,
        todo_list_guest_id: props.guest.id,
      },
    },
  );
  if (!guestSession) {
    throw new HttpException("Invalid or expired guest session", 401);
  }
  // Verify guest entity is still active and fetch created_at
  const guest = await MyGlobal.prisma.todo_list_guest.findUnique({
    where: { id: props.guest.id },
    select: {
      id: true,
      created_at: true,
    },
  });
  if (!guest) {
    throw new HttpException("Guest account does not exist", 401);
  }
  // Generate new expiration times as string & tags.Format<'date-time'>
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create new tokens with same session_id and guest_id
  const access = jwt.sign(
    {
      type: "guest",
      id: props.guest.id,
      session_id: props.guest.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: props.guest.id,
      session_id: props.guest.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Update session expiration
  await MyGlobal.prisma.todo_list_guest_sessions.update({
    where: { id: props.guest.session_id },
    data: { expired_at: refreshExpires },
  });
  // Construct response exactly matching ITodoListGuest.IAuthorized
  return {
    id: guest.id,
    createdAt: toISOStringSafe(guest.created_at),
    isActive: true,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
