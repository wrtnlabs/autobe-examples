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
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";

export async function postTodoAppAuthGuestJoin(props: {
  body: ITodoAppGuest.IJoin;
}): Promise<ITodoAppGuest.IAuthorized> {
  const guestId = v4();
  const id: string & tags.Format<"uuid"> = guestId;
  const now = new Date();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id,
      guest_identifier: "",
      created_at: createdAt,
      updated_at: createdAt,
    },
  });
  const sessionId = v4();
  const sessionIdTyped: string & tags.Format<"uuid"> = sessionId;
  const sessionCreatedAt: string & tags.Format<"date-time"> = createdAt;
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const expiredAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const refreshableUntil: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  const ipAddress: string = props.body.ip ?? "";
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: sessionIdTyped,
      guest_id: guest.id,
      ip: ipAddress,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: sessionCreatedAt,
      expired_at: expiredAt,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  return {
    id: guest.id,
    token,
  };
}
