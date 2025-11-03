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

export async function patchAuthGuestRefresh(props: {
  guest: GuestPayload;
}): Promise<ITodoGuest.IAuthorized> {
  // Extract guest information from authenticated payload
  const { id: guestId, session_id: sessionId, type: guestType } = props.guest;

  // Validate the guest session is still active
  const session = await MyGlobal.prisma.todo_guest_sessions.findFirst({
    where: {
      id: sessionId,
      todo_guest_id: guestId,
      expired_at: null,
    },
    include: {
      guest: true,
    },
  });

  if (!session) {
    throw new HttpException("Guest session expired or not found", 401);
  }

  // Check if guest access has been deleted
  if (session.guest.deleted_at !== null) {
    throw new HttpException("Guest access has been deleted", 403);
  }

  // Generate new tokens maintaining same session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const authorizationToken: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: guestType,
        id: guestId,
        session_id: sessionId,
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
        type: guestType,
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "24h",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update session expiration timestamp
  await MyGlobal.prisma.todo_guest_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return refreshed guest data with proper type handling
  return {
    id: guestId,
    created_at: toISOStringSafe(session.guest.created_at),
    updated_at: toISOStringSafe(session.guest.updated_at),
    deleted_at: session.guest.deleted_at
      ? toISOStringSafe(session.guest.deleted_at)
      : null,
    token: authorizationToken,
  };
}
