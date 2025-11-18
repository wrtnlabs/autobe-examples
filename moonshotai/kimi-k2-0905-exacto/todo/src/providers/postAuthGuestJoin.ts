import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: ITodoAppGuest.ICreate;
}): Promise<ITodoAppGuest.IAuthorized> {
  // Generate unique session identifier for guest tracking
  const sessionIdentifier = `guest_${v4()}` as string;

  // Check for duplicate session identifier (extremely rare but possible)
  const existing = await MyGlobal.prisma.todo_app_guests.findFirst({
    where: { session_identifier: sessionIdentifier },
  });

  if (existing) {
    throw new HttpException("Session identifier collision", 400);
  }

  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create guest actor record first (primary table)
  const guest = await MyGlobal.prisma.todo_app_guests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      session_identifier: sessionIdentifier,
      created_at: now,
      updated_at: now,
      expired_at: refreshExpires,
    },
  });

  // Create guest session record (subsidiary table)
  const session = await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      guest_id: guest.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens with guest payload
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return complete guest authorization response
  return {
    id: guest.id,
    session_identifier: guest.session_identifier,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    expired_at: guest.expired_at
      ? toISOStringSafe(guest.expired_at)
      : undefined,
    token,
  };
}
