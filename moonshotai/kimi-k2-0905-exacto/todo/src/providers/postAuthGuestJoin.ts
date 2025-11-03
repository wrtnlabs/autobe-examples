import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
}): Promise<ITodoGuest.IAuthorized> {
  // Create guest record
  const guest = await MyGlobal.prisma.todo_guests.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  // Create session record - use empty strings since we don't have IP/referrer context
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.todo_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_guest_id: guest.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });

  // Generate JWT tokens
  const now = new Date();
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

  // Return formatted response - convert Prisma Date objects to ISO strings
  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at !== null ? toISOStringSafe(guest.deleted_at) : null,
    token,
  };
}
