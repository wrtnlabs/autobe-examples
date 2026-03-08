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

export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  // Find guest by device_id
  const guest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: {
      device_id: props.body.device_id,
      deleted_at: null,
    },
  });
  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }
  // Find most recent active session for this guest
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      todo_app_guest_id: guest.id,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
  });
  // Generate new token payload
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date().toISOString();
  // Create new session with updated metadata
  const newSession = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4() satisfies string & tags.Format<"uuid">,
      todo_app_guest_id: guest.id,
      ip: session?.ip ?? "0.0.0.0",
      user_agent: session?.user_agent ?? undefined,
      created_at: now,
      expired_at: refreshExpires.toISOString(),
      updated_at: now,
      deleted_at: null,
    },
  });
  // Sign tokens with session info
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: newSession.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: newSession.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    guest: {
      id: guest.id,
      device_id: guest.device_id,
    },
    authorization: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
    },
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
