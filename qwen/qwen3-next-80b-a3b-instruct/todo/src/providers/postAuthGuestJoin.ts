import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: ITodoListGuest.IJoin;
}): Promise<ITodoListGuest.IAuthorized> {
  // Check for existing guest with same email
  const existing = await MyGlobal.prisma.todo_list_guest.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Create guest record
  const guest = await MyGlobal.prisma.todo_list_guest.create({
    data: {
      id: v4(),
      email: props.body.email,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Since schema has no todo_list_guest_sessions table, we cannot create a session record.
  // We must issue token using guest record as the authentication identity.
  // Only possible schema-compliant solution: use guest.id as both actor and session ID.
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Generate JWT tokens using guest as both actor and session
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id, // Actor ID
        session_id: guest.id, // Session ID - no separate table exists, reuse guest ID
        created_at: toISOStringSafe(new Date()),
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
        id: guest.id, // Actor ID
        session_id: guest.id, // Session ID - reuse guest ID
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
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

  return {
    email: guest.email,
    token,
  } satisfies ITodoListGuest.IAuthorized;
}
