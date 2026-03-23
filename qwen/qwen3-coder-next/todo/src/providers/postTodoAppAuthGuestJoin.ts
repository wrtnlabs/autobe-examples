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
  // Validate device_id format (UUID or alphanumeric string)
  const isValidDeviceId =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$|^[a-zA-Z0-9]+$/.test(
      props.body.device_id,
    );
  if (!isValidDeviceId) {
    throw new HttpException("Invalid device_id format", 400);
  }
  // Check for existing active guest with same device_id (case-insensitive)
  const existingGuest = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: {
      device_id: {
        equals: props.body.device_id,
        mode: Prisma.QueryMode.insensitive,
      },
    },
  });
  if (existingGuest && existingGuest.deleted_at === null) {
    throw new HttpException("Device already registered", 409);
  }
  // Create new todo_app_guests record
  const now = new Date();
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: v4(),
      device_id: props.body.device_id,
      ip: props.body.ip,
      user_agent: props.body.user_agent ?? null,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
    select: {
      id: true,
      device_id: true,
      ip: true,
      user_agent: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Calculate expiration timestamps (24 hours for session)
  const accessExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Create initial todo_app_guest_sessions record
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4(),
      todo_app_guest_id: guest.id,
      ip: props.body.ip,
      user_agent: props.body.user_agent ?? null,
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
    select: {
      id: true,
      todo_app_guest_id: true,
      ip: true,
      user_agent: true,
      created_at: true,
      expired_at: true,
    },
  });
  // Generate JWT access token
  const access_token = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "24h", issuer: "autobe" },
  );
  // Generate JWT refresh token
  const refresh_token = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Return IAuthorized response
  return {
    id: guest.id as string & tags.Format<"uuid">,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  } satisfies ITodoAppGuest.IAuthorized;
}
