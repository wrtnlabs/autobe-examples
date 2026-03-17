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
  const now = new Date();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  const guestId = v4();
  const deviceId = props.body.device_id ?? v4();
  const sessionId = v4();
  const guest = await MyGlobal.prisma.multi_user_todo_guests.create({
    data: {
      id: guestId,
      device_id: deviceId,
      created_at: createdAt satisfies string as string,
      updated_at: createdAt satisfies string as string,
    },
    select: {
      id: true,
      device_id: true,
      created_at: true,
    },
  });
  await MyGlobal.prisma.multi_user_todo_guest_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: createdAt satisfies string as string,
      expired_at: accessExpiresAt satisfies string as string,
    },
    select: {
      id: true,
    },
  });
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: guestId as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  } satisfies IMultiUserTodoGuest.IAuthorized;
}
