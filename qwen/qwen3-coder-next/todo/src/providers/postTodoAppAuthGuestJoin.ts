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
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpires = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // Check for duplicate device_id
  const existingGuest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: { device_id: props.body.device_id, deleted_at: null },
  });
  if (existingGuest) {
    throw new HttpException("Device already registered", 409);
  }
  // Create new guest record
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: v4(),
      device_id: props.body.device_id,
      ip: props.body.ip,
      user_agent: props.body.user_agent ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      device_id: true,
    },
  });
  // Create initial session
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4(),
      todo_app_guest_id: guest.id,
      ip: props.body.ip,
      user_agent: props.body.user_agent ?? null,
      referrer: null,
      created_at: now,
      expired_at: accessExpires,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Generate JWT tokens
  const accessPayload = {
    type: "guest" as const,
    id: guest.id,
    session_id: session.id,
    created_at: now,
  };
  const refreshPayload = {
    type: "guest" as const,
    id: guest.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: now,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Build token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Build response
  return {
    guest: {
      id: guest.id as string & tags.Format<"uuid">,
      device_id: guest.device_id,
    },
    authorization: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
    },
    token: token,
  } satisfies ITodoAppGuest.IAuthorized;
}
